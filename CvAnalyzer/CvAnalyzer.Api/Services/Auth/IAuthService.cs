using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Auth;

public interface IAuthService
{
    /// <summary>Throws <see cref="WeakPasswordException"/> or <see cref="EmailAlreadyRegisteredException"/>.</summary>
    Task<User> RegisterAsync(string email, string password, CancellationToken cancellationToken = default);

    /// <summary>Throws <see cref="InvalidCredentialsException"/> for any failure (unknown email, wrong password, inactive account) — never distinguishes which.</summary>
    Task<User> LoginAsync(string email, string password, CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Throws <see cref="IncorrectPasswordException"/> or <see cref="WeakPasswordException"/>.</summary>
    Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, CancellationToken cancellationToken = default);

    /// <summary>
    /// Never throws and never reveals whether the email is registered (the caller must show the
    /// same response either way). Returns the raw (unhashed) token when a matching active account
    /// was found — for internal/test use and Development-only logging only; a controller must
    /// never put this value in an HTTP response.
    /// </summary>
    Task<string?> RequestPasswordResetAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>Throws <see cref="InvalidOrExpiredTokenException"/> or <see cref="WeakPasswordException"/>.</summary>
    Task ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken = default);

    /// <summary>No-op (returns null) if the user is unknown or already verified. Same raw-token caveat as <see cref="RequestPasswordResetAsync"/>.</summary>
    Task<string?> RequestEmailVerificationAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Throws <see cref="InvalidOrExpiredTokenException"/>.</summary>
    Task VerifyEmailAsync(string token, CancellationToken cancellationToken = default);

    /// <summary>Soft-closes the account (User.IsActive = false) — CVs/Analyses/Subscriptions/PaymentTransactions are preserved. Throws <see cref="IncorrectPasswordException"/>.</summary>
    Task DeactivateAccountAsync(Guid userId, string password, CancellationToken cancellationToken = default);
}
