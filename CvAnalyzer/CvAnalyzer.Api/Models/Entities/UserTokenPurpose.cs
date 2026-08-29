namespace CvAnalyzer.Api.Models.Entities;

/// <summary>What a <see cref="UserToken"/> row may be redeemed for — a single table backs both
/// flows since they share the same security shape (random token, hashed at rest, expiring,
/// single-use) rather than two near-identical tables.</summary>
public enum UserTokenPurpose
{
    PasswordReset,
    EmailVerification,
}
