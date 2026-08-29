namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// A single-use, expiring, out-of-band credential (password reset link, email verification link).
/// Only <see cref="TokenHash"/> (SHA-256 of the random value actually handed to the user) is ever
/// persisted — the plaintext token exists only transiently in memory when generated and, in
/// Development only, in a log line (see AuthService) so the flow is testable without a real email
/// provider. It is never returned by any API response.
/// </summary>
public class UserToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public UserTokenPurpose Purpose { get; set; }

    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    /// <summary>Null until redeemed — a non-null value makes the token permanently unusable (single-use).</summary>
    public DateTime? UsedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
