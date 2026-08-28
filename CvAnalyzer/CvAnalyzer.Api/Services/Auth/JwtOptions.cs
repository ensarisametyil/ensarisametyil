namespace CvAnalyzer.Api.Services.Auth;

/// <summary>
/// Bound from the "Jwt" configuration section. SigningKey must never come from
/// appsettings.json in source control — see the appsettings.json placeholder and
/// docs/authentication.md for how to set it via user-secrets (Development) or an
/// environment variable (other environments).
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;

    public string Audience { get; set; } = string.Empty;

    public string SigningKey { get; set; } = string.Empty;

    public int ExpirationMinutes { get; set; } = 60;
}
