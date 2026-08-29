using CvAnalyzer.Api.Services.Email;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Records every call instead of sending anything — lets a test assert AuthService invoked the right notification without any real (or even logged) email.</summary>
public class FakeEmailService : IEmailService
{
    public List<(string ToEmail, string Token, DateTime ExpiresAtUtc)> PasswordResetEmails { get; } = [];

    public List<(string ToEmail, string Token, DateTime ExpiresAtUtc)> VerificationEmails { get; } = [];

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, CancellationToken cancellationToken = default)
    {
        PasswordResetEmails.Add((toEmail, resetToken, expiresAtUtc));
        return Task.CompletedTask;
    }

    public Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, CancellationToken cancellationToken = default)
    {
        VerificationEmails.Add((toEmail, verificationToken, expiresAtUtc));
        return Task.CompletedTask;
    }
}
