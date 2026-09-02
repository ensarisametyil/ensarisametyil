using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// The real <see cref="IEmailService"/> implementation, registered by Program.cs once
/// <see cref="SmtpOptions"/> is fully configured. Builds each email (subject/HTML/plain-text via
/// <see cref="EmailCopyCatalog"/> and <see cref="EmailTemplateRenderer"/>) and hands the finished
/// <see cref="MailMessage"/> to <see cref="ISmtpTransport"/> for the actual network send — in
/// production that's <see cref="RealSmtpTransport"/>, using the .NET base class library's own
/// <see cref="SmtpClient"/> (already part of this codebase's toolkit — see ContactController's
/// use of <see cref="MailAddress"/>) rather than pulling in a new SMTP package: a single-host,
/// STARTTLS, username/password connection — exactly what Gmail SMTP (and any future domain-based
/// SMTP provider, see SmtpOptions' doc comment) needs.
///
/// Never throws (see IEmailService's doc comment) — a delivery failure is logged and swallowed,
/// never allowed to fail the caller's own operation (registration, password-reset/verification
/// token issuance all persist to the database before this is ever called).
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly SmtpOptions _options;
    private readonly ISmtpTransport _transport;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<SmtpOptions> options, ISmtpTransport transport, TimeProvider timeProvider, ILogger<SmtpEmailService> logger)
    {
        _options = options.Value;
        _transport = transport;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public Task SendWelcomeEmailAsync(string toEmail, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        var copy = EmailCopyCatalog.Welcome(locale);
        var dashboardUrl = $"{FrontendOrigin}/app";
        var (html, text) = EmailTemplateRenderer.Render(copy.Heading, copy.BodyHtml, copy.BodyPlainText, dashboardUrl, copy.CtaLabel, copy.FooterNoteHtml, copy.FooterNotePlainText);
        return SendAsync("welcome", toEmail, copy.Subject, html, text, cancellationToken);
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        var copy = EmailCopyCatalog.PasswordReset(locale, HoursUntil(expiresAtUtc));
        var resetUrl = $"{FrontendOrigin}/reset-password?token={Uri.EscapeDataString(resetToken)}";
        var (html, text) = EmailTemplateRenderer.Render(copy.Heading, copy.BodyHtml, copy.BodyPlainText, resetUrl, copy.CtaLabel, copy.FooterNoteHtml, copy.FooterNotePlainText);
        return SendAsync("password-reset", toEmail, copy.Subject, html, text, cancellationToken);
    }

    public Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        var copy = EmailCopyCatalog.EmailVerification(locale, HoursUntil(expiresAtUtc));
        // No frontend route consumes this yet (see docs/email.md) — the endpoint that triggers
        // this email (POST /api/auth/send-verification) has no UI entry point either, so this
        // path exists for interface completeness/future-readiness rather than real traffic today.
        var verifyUrl = $"{FrontendOrigin}/verify-email?token={Uri.EscapeDataString(verificationToken)}";
        var (html, text) = EmailTemplateRenderer.Render(copy.Heading, copy.BodyHtml, copy.BodyPlainText, verifyUrl, copy.CtaLabel, copy.FooterNoteHtml, copy.FooterNotePlainText);
        return SendAsync("email-verification", toEmail, copy.Subject, html, text, cancellationToken);
    }

    private string FrontendOrigin => _options.FrontendBaseUrl.TrimEnd('/');

    private int HoursUntil(DateTime expiresAtUtc) =>
        Math.Max(1, (int)Math.Round((expiresAtUtc - _timeProvider.GetUtcNow().UtcDateTime).TotalHours));

    private async Task SendAsync(string purpose, string toEmail, string subject, string htmlBody, string plainTextBody, CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
        {
            // Should not happen in practice — Program.cs only registers this class when
            // IsConfigured is true — but guards against a runtime configuration change/misuse
            // rather than throwing.
            _logger.LogWarning("SmtpEmailService.{Purpose} invoked without complete SMTP configuration; email not sent.", purpose);
            return;
        }

        try
        {
            // Not wrapped in `using` — ISmtpTransport (a real send or, in tests, a fake that
            // records the message for later inspection) owns the message's lifetime once handed
            // off; RealSmtpTransport's SmtpClient.SendMailAsync doesn't require the caller to
            // dispose it, and eagerly disposing here would tear down its AlternateViews' streams
            // out from under a transport that still needs to read them (or a test asserting on them).
            var message = new MailMessage
            {
                From = new MailAddress(_options.FromAddress, _options.FromName),
                Subject = subject,
                Body = plainTextBody,
                IsBodyHtml = false,
            };
            message.To.Add(new MailAddress(toEmail));
            // Plain text first, HTML last — by multipart/alternative convention the LAST part is
            // the "preferred" one a capable client renders, so HTML-capable clients show the rich
            // version while plain-text-only clients fall back to the first.
            message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(plainTextBody, null, "text/plain"));
            message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html"));

            await _transport.SendAsync(message, _options, cancellationToken);
        }
        catch (Exception ex)
        {
            // Never let an SMTP/network failure propagate to the caller — see IEmailService's
            // doc comment. Logged without the recipient address or any email content/token (see
            // docs/email.md's logging discipline note) — only which kind of email failed to send.
            _logger.LogError(ex, "Failed to send {Purpose} email.", purpose);
        }
    }
}
