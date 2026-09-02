namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// Seam between the auth flows (registration, password-reset, email-verification — and, in the
/// future, subscription/payment/quota/CV-analysis notifications, see docs/email.md) and however
/// those notifications actually get delivered. Two implementations exist: <see cref="SmtpEmailService"/>
/// (real Gmail SMTP send, used once <see cref="SmtpOptions"/> is configured) and
/// <see cref="LoggingEmailService"/> (Development-only logging fallback, used when it isn't yet) —
/// Program.cs picks one at startup. Every caller (AuthService) talks only to this interface, so
/// swapping providers later (a different SMTP host, or a transactional-email API like SendGrid/SES)
/// never touches AuthService, its tests, or the token-issuance logic.
///
/// <b>Contract every implementation must uphold:</b> never throw. A send failure (bad credentials,
/// network error, provider outage) must never fail the caller's own operation — a user's
/// registration, password-reset token issuance, or email-verification token issuance must always
/// succeed regardless of whether the resulting email could actually be delivered. Implementations
/// log failures internally instead.
/// </summary>
public interface IEmailService
{
    /// <summary>Notifies the user their account was created. Not security-sensitive — carries no token.</summary>
    Task SendWelcomeEmailAsync(string toEmail, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default);

    /// <summary>Notifies the user a password-reset was requested. <paramref name="resetToken"/> is the plaintext, single-use token — never logged or persisted anywhere except by this call.</summary>
    Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default);

    /// <summary>Notifies the user an email-verification link was requested. <paramref name="verificationToken"/> is the plaintext, single-use token.</summary>
    Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default);
}
