using CvAnalyzer.Api.Services.Email;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace CvAnalyzer.Api.Tests.Services.Email;

/// <summary>
/// LoggingEmailService is a safe no-op everywhere except Development, where it logs (never
/// persists or returns) the token so the reset/verification flow can be exercised without a real
/// provider — exactly the behavior AuthService used to have inline, now isolated behind the
/// IEmailService seam.
/// </summary>
public class LoggingEmailServiceTests
{
    [Fact]
    public async Task SendPasswordResetEmailAsync_Development_LogsTheToken()
    {
        var logger = new RecordingLogger<LoggingEmailService>();
        var sut = new LoggingEmailService(new FakeHostEnvironment { EnvironmentName = "Development" }, logger);

        await sut.SendPasswordResetEmailAsync("user@example.com", "secret-token-123", DateTime.UtcNow.AddHours(1));

        var entry = Assert.Single(logger.Entries);
        Assert.Contains("secret-token-123", entry);
        Assert.Contains("user@example.com", entry);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_Development_Logs()
    {
        var logger = new RecordingLogger<LoggingEmailService>();
        var sut = new LoggingEmailService(new FakeHostEnvironment { EnvironmentName = "Development" }, logger);

        await sut.SendWelcomeEmailAsync("user@example.com");

        var entry = Assert.Single(logger.Entries);
        Assert.Contains("user@example.com", entry);
        Assert.Contains("welcome", entry);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_NonDevelopment_NeverLogs()
    {
        var logger = new RecordingLogger<LoggingEmailService>();
        var sut = new LoggingEmailService(new FakeHostEnvironment { EnvironmentName = "Production" }, logger);

        await sut.SendWelcomeEmailAsync("user@example.com");

        Assert.Empty(logger.Entries);
    }

    [Fact]
    public async Task SendEmailVerificationEmailAsync_Development_LogsTheToken()
    {
        var logger = new RecordingLogger<LoggingEmailService>();
        var sut = new LoggingEmailService(new FakeHostEnvironment { EnvironmentName = "Development" }, logger);

        await sut.SendEmailVerificationEmailAsync("user@example.com", "verify-token-456", DateTime.UtcNow.AddHours(24));

        var entry = Assert.Single(logger.Entries);
        Assert.Contains("verify-token-456", entry);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task SendPasswordResetEmailAsync_NonDevelopment_NeverLogsTheToken(string environmentName)
    {
        var logger = new RecordingLogger<LoggingEmailService>();
        var sut = new LoggingEmailService(new FakeHostEnvironment { EnvironmentName = environmentName }, logger);

        await sut.SendPasswordResetEmailAsync("user@example.com", "secret-token-123", DateTime.UtcNow.AddHours(1));

        Assert.Empty(logger.Entries);
    }

    private class RecordingLogger<T> : ILogger<T>
    {
        public List<string> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Entries.Add(formatter(state, exception));

        private class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}
