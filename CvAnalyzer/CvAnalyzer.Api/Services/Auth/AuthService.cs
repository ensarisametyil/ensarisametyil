using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Auth;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IPasswordPolicy _passwordPolicy;

    public AuthService(AppDbContext db, IPasswordHasher<User> passwordHasher, IPasswordPolicy passwordPolicy)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _passwordPolicy = passwordPolicy;
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

        var now = DateTime.UtcNow;
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
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return user;
    }

    public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
