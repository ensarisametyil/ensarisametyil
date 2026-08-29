using System.Security.Cryptography;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Auth;

public class AuthService : IAuthService
{
    private static readonly TimeSpan PasswordResetTokenLifetime = TimeSpan.FromHours(1);
    private static readonly TimeSpan EmailVerificationTokenLifetime = TimeSpan.FromHours(24);

    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IPasswordPolicy _passwordPolicy;
    private readonly TimeProvider _timeProvider;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        IPasswordPolicy passwordPolicy,
        TimeProvider timeProvider,
        IHostEnvironment environment,
        ILogger<AuthService> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _passwordPolicy = passwordPolicy;
        _timeProvider = timeProvider;
        _environment = environment;
        _logger = logger;
    }

    public async Task<User> RegisterAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);

        var policyError = _passwordPolicy.Validate(password);
        if (policyError is not null)
        {
            throw new WeakPasswordException(policyError);
        }

        var emailTaken = await _db.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (emailTaken)
        {
            throw new EmailAlreadyRegisteredException();
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            CreatedAt = now,
            UpdatedAt = now,
        };
        // PasswordHasher needs the user instance for its salt derivation, so this must come
        // after the user object exists but before it's persisted — plain text never touches the DB.
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return user;
    }

    public async Task<User> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (user is null || !user.IsActive)
        {
            throw new InvalidCredentialsException();
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new InvalidCredentialsException();
        }

        if (verificationResult == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            user.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return user;
    }

    public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new IncorrectPasswordException();
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, currentPassword);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new IncorrectPasswordException();
        }

        var policyError = _passwordPolicy.Validate(newPassword);
        if (policyError is not null)
        {
            throw new WeakPasswordException(policyError);
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        user.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<string?> RequestPasswordResetAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        // Deliberately silent for "no such user" / inactive account — the caller (AuthController)
        // always returns the same generic response regardless of this method's result, so a caller
        // can never use this endpoint to enumerate which emails are registered.
        if (user is null || !user.IsActive)
        {
            return null;
        }

        return await IssueTokenAsync(user, UserTokenPurpose.PasswordReset, PasswordResetTokenLifetime, cancellationToken);
    }

    public async Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default)
    {
        var tokenRow = await ResolveValidTokenAsync(token, UserTokenPurpose.PasswordReset, cancellationToken);
        if (tokenRow is null)
        {
            throw new InvalidOrExpiredTokenException();
        }

        var policyError = _passwordPolicy.Validate(newPassword);
        if (policyError is not null)
        {
            throw new WeakPasswordException(policyError);
        }

        var user = await _db.Users.SingleAsync(u => u.Id == tokenRow.UserId, cancellationToken);
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
        user.UpdatedAt = now;
        tokenRow.UsedAt = now;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<string?> RequestEmailVerificationAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null || user.EmailVerifiedAt is not null)
        {
            return null;
        }

        return await IssueTokenAsync(user, UserTokenPurpose.EmailVerification, EmailVerificationTokenLifetime, cancellationToken);
    }

    public async Task VerifyEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        var tokenRow = await ResolveValidTokenAsync(token, UserTokenPurpose.EmailVerification, cancellationToken);
        if (tokenRow is null)
        {
            throw new InvalidOrExpiredTokenException();
        }

        var user = await _db.Users.SingleAsync(u => u.Id == tokenRow.UserId, cancellationToken);
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        user.EmailVerifiedAt = now;
        tokenRow.UsedAt = now;

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeactivateAccountAsync(Guid userId, string password, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new IncorrectPasswordException();
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            throw new IncorrectPasswordException();
        }

        user.IsActive = false;
        user.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Generates a cryptographically random token, persists only its SHA-256 hash (never the
    /// plaintext), and returns the plaintext to the caller. In Development only, also logs it —
    /// there is no real email provider wired up yet (see docs/authentication.md), so this is the
    /// only way to exercise the reset/verification flow end-to-end without one; the log line is
    /// never emitted outside Development, and the plaintext is never persisted or returned by any
    /// HTTP response.
    /// </summary>
    private async Task<string> IssueTokenAsync(User user, UserTokenPurpose purpose, TimeSpan validFor, CancellationToken cancellationToken)
    {
        var rawToken = GenerateRawToken();
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        _db.UserTokens.Add(new UserToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Purpose = purpose,
            TokenHash = HashToken(rawToken),
            ExpiresAt = now.Add(validFor),
            CreatedAt = now,
        });
        await _db.SaveChangesAsync(cancellationToken);

        if (_environment.IsDevelopment())
        {
            _logger.LogInformation(
                "[DEV ONLY — never logged outside Development] {Purpose} token for user {UserId}: {Token} (expires {ExpiresAt:o})",
                purpose, user.Id, rawToken, now.Add(validFor));
        }

        return rawToken;
    }

    private async Task<UserToken?> ResolveValidTokenAsync(string token, UserTokenPurpose purpose, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var tokenHash = HashToken(token);
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var tokenRow = await _db.UserTokens.SingleOrDefaultAsync(
            t => t.TokenHash == tokenHash && t.Purpose == purpose, cancellationToken);

        if (tokenRow is null || tokenRow.UsedAt is not null || tokenRow.ExpiresAt <= now)
        {
            return null;
        }

        return tokenRow;
    }

    private static string GenerateRawToken() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
