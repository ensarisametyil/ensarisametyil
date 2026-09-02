using CvAnalyzer.Api.Services.Email;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Records every call instead of sending anything — lets a test assert AuthService invoked the right notification without any real (or even logged) email.</summary>
public class FakeEmailService : IEmailService
{
    public List<(string ToEmail, string Locale)> WelcomeEmails { get; } = [];

    public List<(string ToEmail, string Token, DateTime ExpiresAtUtc, string Locale)> PasswordResetEmails { get; } = [];

    public List<(string ToEmail, string Token, DateTime ExpiresAtUtc, string Locale)> VerificationEmails { get; } = [];

    public Task SendWelcomeEmailAsync(string toEmail, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        WelcomeEmails.Add((toEmail, locale));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        PasswordResetEmails.Add((toEmail, resetToken, expiresAtUtc, locale));
        return Task.CompletedTask;
    }

    public Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        VerificationEmails.Add((toEmail, verificationToken, expiresAtUtc, locale));
        return Task.CompletedTask;
    }
}
