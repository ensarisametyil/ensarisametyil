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
}
