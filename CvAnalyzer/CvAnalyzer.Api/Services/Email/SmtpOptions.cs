namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// Bound from the "Smtp" configuration section — mirrors the existing AiOptions/IyzicoOptions
/// pattern (Options class colocated with its service, User/Password never in appsettings.json in
/// source control). Development: `dotnet user-secrets set Smtp:User/Smtp:Password "..."`.
/// Production/other environments: `Smtp__User` / `Smtp__Password` environment variables.
///
/// Provider-agnostic by design: every property here is a plain SMTP connection detail (host,
/// port, credentials, from-address), never anything Gmail-specific. Moving from the interim Gmail
/// SMTP account to a real `@cvorai...` domain mailbox (once domain/hosting exist) is a
/// configuration change only — Host/User/Password/FromAddress get new values, nothing in code
/// changes. A future switch to a transactional-email API provider (SendGrid, SES, ...) instead of
/// SMTP would be a second <see cref="IEmailService"/> implementation, exactly like this one
/// replaced <see cref="LoggingEmailService"/> — see IEmailService's doc comment.
/// </summary>
public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;

    /// <summary>587 (STARTTLS) is what Gmail and most modern providers expect; not 465 (implicit TLS, deprecated) or 25 (unencrypted, blocked by most providers/hosts).</summary>
    public int Port { get; set; } = 587;

    public string User { get; set; } = string.Empty;

    /// <summary>For Gmail specifically: a 16-character Google App Password (requires 2-Step Verification on the sending account), never the account's real login password.</summary>
    public string Password { get; set; } = string.Empty;

    public string FromAddress { get; set; } = string.Empty;

    public string FromName { get; set; } = "CVora AI";

    public bool EnableSsl { get; set; } = true;

    /// <summary>
    /// Origin used to build links inside emails (password reset, dashboard CTA) — e.g.
    /// `{FrontendBaseUrl}/reset-password?token=...`. Mirrors IyzicoOptions.FrontendResultUrl's
    /// existing "frontend URL lives in the relevant feature's own Options" convention rather than
    /// a new shared config type. Update this to the real `https://app.cvorai...` origin once
    /// domain/hosting exist — nothing else about link construction changes.
    /// </summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";

    /// <summary>
    /// True once every value SmtpEmailService actually needs to open a connection is present.
    /// Checked once at startup (Program.cs) to decide which IEmailService implementation to
    /// register — mirrors IyzicoOptions.IsConfigured / PlanOptions being read the same way.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Host) &&
        !string.IsNullOrWhiteSpace(User) &&
        !string.IsNullOrWhiteSpace(Password) &&
        !string.IsNullOrWhiteSpace(FromAddress);
}
