using CvAnalyzer.Api.Services.Email;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Email;

/// <summary>
/// Never opens a real SMTP connection — every test injects a FakeSmtpTransport that records the
/// built MailMessage instead (see ISmtpTransport's doc comment). This is what "mock/fake
/// transporter" testing looks like for this codebase: assert what SmtpEmailService built and
/// handed off, not that a real mailbox received anything.
/// </summary>
public class SmtpEmailServiceTests
{
    private static readonly DateTime Now = new(2026, 9, 2, 12, 0, 0, DateTimeKind.Utc);

    private static SmtpOptions CreateOptions() => new()
    {
        Host = "smtp.example.com",
        Port = 587,
        User = "cvora.ai@gmail.com",
        Password = "app-password",
        FromAddress = "cvora.ai@gmail.com",
        FromName = "CVora AI",
        EnableSsl = true,
        FrontendBaseUrl = "https://app.cvorai.example",
    };

    private static (SmtpEmailService Sut, FakeSmtpTransport Transport) CreateSut(SmtpOptions? options = null)
    {
        var transport = new FakeSmtpTransport();
        var clock = new FakeTimeProvider(new DateTimeOffset(Now));
        var sut = new SmtpEmailService(Options.Create(options ?? CreateOptions()), transport, clock, NullLogger<SmtpEmailService>.Instance);
        return (sut, transport);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_BuildsAndSendsOneMessage()
    {
        var (sut, transport) = CreateSut();

        await sut.SendWelcomeEmailAsync("newuser@example.com");

        var message = Assert.Single(transport.SentMessages);
        Assert.Equal("newuser@example.com", message.To.Single().Address);
        Assert.Equal("cvora.ai@gmail.com", message.From!.Address);
        Assert.Equal("CVora AI", message.From!.DisplayName);
        Assert.Equal("CVora AI'ye Hoş Geldiniz!", message.Subject);
    }

    [Fact]
    public async Task SendWelcomeEmailAsync_CtaLinksToTheConfiguredFrontendDashboard()
    {
        var (sut, transport) = CreateSut();

        await sut.SendWelcomeEmailAsync("newuser@example.com");

        var message = Assert.Single(transport.SentMessages);
        var html = ReadView(message, "text/html");
        Assert.Contains("https://app.cvorai.example/app", html);
    }

    [Theory]
    [InlineData("en", "Welcome to CVora AI!")]
    [InlineData("de", "Willkommen bei CVora AI!")]
    [InlineData("tr", "CVora AI'ye Hoş Geldiniz!")]
    [InlineData("fr", "CVora AI'ye Hoş Geldiniz!")] // unsupported -> Turkish fallback
    public async Task SendWelcomeEmailAsync_UsesTheRequestedLocale(string locale, string expectedSubject)
    {
        var (sut, transport) = CreateSut();

        await sut.SendWelcomeEmailAsync("newuser@example.com", locale);

        Assert.Equal(expectedSubject, Assert.Single(transport.SentMessages).Subject);
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_CtaLinksToResetPasswordWithTheEscapedToken()
    {
        var (sut, transport) = CreateSut();

        await sut.SendPasswordResetEmailAsync("user@example.com", "raw token/with+special=chars", Now.AddHours(1));

        var message = Assert.Single(transport.SentMessages);
        var html = ReadView(message, "text/html");
        Assert.Contains("https://app.cvorai.example/reset-password?token=raw%20token%2Fwith%2Bspecial%3Dchars", html);
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_TokenAppearsExactlyOnceInsideTheLinkQueryString()
    {
        // The token must only ever appear inside the CTA link's ?token= query parameter — never
        // duplicated elsewhere in the body (defense against any copy/paste mistake introducing a
        // second, unescaped occurrence).
        var (sut, transport) = CreateSut();

        await sut.SendPasswordResetEmailAsync("user@example.com", "SUPER-SECRET-TOKEN", Now.AddHours(1));

        var message = Assert.Single(transport.SentMessages);
        var html = ReadView(message, "text/html");
        Assert.Single(System.Text.RegularExpressions.Regex.Matches(html, "SUPER-SECRET-TOKEN"));
        Assert.Contains("token=SUPER-SECRET-TOKEN", html);
    }

    [Fact]
    public async Task SendPasswordResetEmailAsync_StatesTheActualRemainingValidityInHours()
    {
        var (sut, transport) = CreateSut();

        await sut.SendPasswordResetEmailAsync("user@example.com", "token", Now.AddHours(1));

        var message = Assert.Single(transport.SentMessages);
        var text = ReadView(message, "text/plain");
        Assert.Contains("1 saat geçerlidir", text);
    }

    [Fact]
    public async Task SendEmailVerificationEmailAsync_CtaLinksToVerifyEmailWithTheToken()
    {
        var (sut, transport) = CreateSut();

        await sut.SendEmailVerificationEmailAsync("user@example.com", "verify-token", Now.AddHours(24));

        var message = Assert.Single(transport.SentMessages);
        var html = ReadView(message, "text/html");
        Assert.Contains("https://app.cvorai.example/verify-email?token=verify-token", html);
    }

    [Fact]
    public async Task SendAsync_MessageHasBothPlainTextAndHtmlAlternateViews()
    {
        var (sut, transport) = CreateSut();

        await sut.SendWelcomeEmailAsync("user@example.com");

        var message = Assert.Single(transport.SentMessages);
        Assert.Equal(2, message.AlternateViews.Count);
        Assert.Contains(message.AlternateViews, v => v.ContentType.MediaType == "text/plain");
        Assert.Contains(message.AlternateViews, v => v.ContentType.MediaType == "text/html");
    }

    [Fact]
    public async Task TransportThrows_DoesNotPropagateToTheCaller()
    {
        // The never-throw contract (see IEmailService's doc comment) — a network/credential
        // failure inside the transport must never surface as an exception to AuthService.
        var transport = new FakeSmtpTransport { ThrowOnSend = new System.Net.Mail.SmtpException("boom") };
        var sut = new SmtpEmailService(Options.Create(CreateOptions()), transport, new FakeTimeProvider(new DateTimeOffset(Now)), NullLogger<SmtpEmailService>.Instance);

        var exception = await Record.ExceptionAsync(() => sut.SendWelcomeEmailAsync("user@example.com"));

        Assert.Null(exception);
    }

    [Fact]
    public async Task TransportThrows_LogsTheFailureWithoutTheRecipientAddress()
    {
        var transport = new FakeSmtpTransport { ThrowOnSend = new InvalidOperationException("connection refused") };
        var logger = new RecordingLogger();
        var sut = new SmtpEmailService(Options.Create(CreateOptions()), transport, new FakeTimeProvider(new DateTimeOffset(Now)), logger);

        await sut.SendWelcomeEmailAsync("secret-recipient@example.com");

        var entry = Assert.Single(logger.Entries);
        Assert.DoesNotContain("secret-recipient@example.com", entry);
        Assert.Contains("welcome", entry);
    }

    [Fact]
    public async Task NotConfigured_NeverCallsTheTransport()
    {
        // Guards SmtpEmailService's own defensive check — Program.cs only ever registers this
        // class when SmtpOptions.IsConfigured is true, but the class itself must still refuse to
        // send (never throw, never silently attempt a doomed connection) if that invariant were
        // ever violated by a runtime configuration change.
        var (sut, transport) = CreateSut(new SmtpOptions()); // every field empty -> not configured

        await sut.SendWelcomeEmailAsync("user@example.com");

        Assert.Empty(transport.SentMessages);
    }

    private static string ReadView(System.Net.Mail.MailMessage message, string mediaType)
    {
        var view = message.AlternateViews.Single(v => v.ContentType.MediaType == mediaType);
        using var reader = new StreamReader(view.ContentStream);
        return reader.ReadToEnd();
    }

    private class RecordingLogger : ILogger<SmtpEmailService>
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
