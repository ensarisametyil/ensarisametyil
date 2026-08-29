namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// Seam between the password-reset/email-verification flows and however those notifications
/// actually get delivered. No real provider is wired up in this environment — see
/// <see cref="LoggingEmailService"/> — but AuthService talks only to this interface, so a real
/// provider (SendGrid, SES, SMTP, ...) can be dropped in later as a second implementation without
/// touching AuthService, its tests, or the token-issuance logic at all.
/// </summary>
public interface IEmailService
{
    /// <summary>Notifies the user a password-reset was requested. <paramref name="resetToken"/> is the plaintext, single-use token — never logged or persisted anywhere except by this call.</summary>
    Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, CancellationToken cancellationToken = default);

    /// <summary>Notifies the user an email-verification link was requested. <paramref name="verificationToken"/> is the plaintext, single-use token.</summary>
    Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, CancellationToken cancellationToken = default);
}
