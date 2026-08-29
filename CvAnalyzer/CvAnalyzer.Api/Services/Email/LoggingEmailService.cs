namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// The only <see cref="IEmailService"/> implementation until a real provider is connected — no
/// real SMTP/API credentials exist in this environment. In Development it logs the token so the
/// reset/verification flow can be exercised end-to-end without a real inbox (identical to
/// AuthService's previous inline behavior, just moved behind this seam); outside Development it
/// is a safe no-op, exactly as honest as the "we don't have a real email provider yet" message
/// AuthController already returns to callers — it never silently pretends to have sent anything.
/// A real implementation (SendGrid, SES, SMTP, ...) replaces this one registration in Program.cs;
/// nothing else in the codebase needs to change.
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

    public Task SendPasswordResetEmailAsync(string toEmail, string resetToken, DateTime expiresAtUtc, CancellationToken cancellationToken = default)
    {
        LogIfDevelopment("password-reset", toEmail, resetToken, expiresAtUtc);
        return Task.CompletedTask;
    }

    public Task SendEmailVerificationEmailAsync(string toEmail, string verificationToken, DateTime expiresAtUtc, CancellationToken cancellationToken = default)
    {
        LogIfDevelopment("email-verification", toEmail, verificationToken, expiresAtUtc);
        return Task.CompletedTask;
    }

    private void LogIfDevelopment(string purpose, string toEmail, string token, DateTime expiresAtUtc)
    {
        if (!_environment.IsDevelopment())
        {
            return;
        }

        // [DEV ONLY] — never emitted outside Development. The token is otherwise never logged or
        // persisted anywhere (UserToken stores only its SHA-256 hash).
        _logger.LogInformation(
            "[DEV ONLY — never logged outside Development] {Purpose} email for {ToEmail}: token={Token} (expires {ExpiresAt:o})",
            purpose, toEmail, token, expiresAtUtc);
    }
}
