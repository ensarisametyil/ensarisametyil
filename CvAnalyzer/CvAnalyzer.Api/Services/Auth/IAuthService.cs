using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Auth;

public interface IAuthService
{
    /// <summary>Throws <see cref="WeakPasswordException"/> or <see cref="EmailAlreadyRegisteredException"/>.</summary>
    Task<User> RegisterAsync(string email, string password, CancellationToken cancellationToken = default);

    /// <summary>Throws <see cref="InvalidCredentialsException"/> for any failure (unknown email, wrong password, inactive account) — never distinguishes which.</summary>
    Task<User> LoginAsync(string email, string password, CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);
}
