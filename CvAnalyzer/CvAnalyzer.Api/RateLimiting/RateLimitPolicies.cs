namespace CvAnalyzer.Api.RateLimiting;

/// <summary>Policy name constants for [EnableRateLimiting] — kept as constants so a typo doesn't silently create an unlimited/no-op policy.</summary>
public static class RateLimitPolicies
{
    public const string Auth = "auth";
    public const string Analyze = "analyze";
    public const string Checkout = "checkout";
    public const string Contact = "contact";
    public const string PasswordReset = "password-reset";
    public const string Account = "account";

    /// <summary>Every /api/admin/* endpoint — role-gated already, but still automatable by a compromised/misused admin credential, so it gets the same speed-bump every other authenticated surface gets (Stage 17 security audit).</summary>
    public const string Admin = "admin";
}
