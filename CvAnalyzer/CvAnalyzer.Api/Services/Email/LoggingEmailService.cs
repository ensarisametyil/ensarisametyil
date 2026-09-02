namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// The fallback <see cref="IEmailService"/> implementation for whenever <see cref="SmtpOptions"/>
/// isn't fully configured (Program.cs decides which of the two gets registered — see
/// <see cref="SmtpEmailService"/> for the real-send path). In Development it logs the token so the
/// reset/verification flow can still be exercised end-to-end without a real inbox; outside
/// Development it is a safe no-op — it never silently pretends to have sent anything.
/// </summary>
public class LoggingEmailService : IEmailService
{
    private readonly IHostEnvironment _environment;
    private readonly ILogger<LoggingEmailService> _logger;

    public LoggingEmailService(IHostEnvironment environment, ILogger<LoggingEmailService> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public Task SendWelcomeEmailAsync(string toEmail, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        LogIfDevelopment("welcome", toEmail, token: null, expiresAtUtc: null);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        LogIfDevelopment("password-reset", toEmail, resetToken, expiresAtUtc);
        return Task.CompletedTask;
    }

    public Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, string locale = EmailCopyCatalog.DefaultLocale, CancellationToken cancellationToken = default)
    {
        LogIfDevelopment("email-verification", toEmail, verificationToken, expiresAtUtc);
        return Task.CompletedTask;
    }

    private void LogIfDevelopment(string purpose, string toEmail, string? token, DateTime? expiresAtUtc)
    {
        if (!_environment.IsDevelopment())
        {
            return;
        }

        // [DEV ONLY] — never emitted outside Development. The token is otherwise never logged or
        // persisted anywhere (UserToken stores only its SHA-256 hash).
        var expiresAtText = expiresAtUtc?.ToString("o") ?? "(n/a)";
        _logger.LogInformation(
            "[DEV ONLY — never logged outside Development] {Purpose} email for {ToEmail}: token={Token} (expires {ExpiresAt})",
            purpose, toEmail, token ?? "(none)", expiresAtText);
    }
}
