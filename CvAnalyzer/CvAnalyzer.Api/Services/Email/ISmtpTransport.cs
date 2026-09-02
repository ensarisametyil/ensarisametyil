using System.Net.Mail;

namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// The actual network I/O step of sending one already-built <see cref="MailMessage"/>, factored
/// out of <see cref="SmtpEmailService"/> as its own seam — mirrors this codebase's existing
/// pattern of never letting a service unit-test require the real external dependency (compare
/// IPaymentProvider/IAiCvAnalysisService). SmtpEmailServiceTests injects a fake implementation
/// that records what was sent, so subject/recipient/HTML-vs-plaintext content and locale can all
/// be asserted without opening a real SMTP connection anywhere — see docs/email.md's testing note.
/// </summary>
public interface ISmtpTransport
{
    Task SendAsync(MailMessage message, SmtpOptions options, CancellationToken cancellationToken);
}

/// <summary>The only real implementation — opens a genuine SMTP connection via the .NET base class library's <see cref="SmtpClient"/>. Registered in Program.cs; never constructed directly in a test.</summary>
public class RealSmtpTransport : ISmtpTransport
{
    public async Task SendAsync(MailMessage message, SmtpOptions options, CancellationToken cancellationToken)
    {
        // The message and client are only ever needed for the duration of this one send — nothing
        // outside this method reads the message afterwards in the real (non-test) path, so both
        // are safe to dispose here.
        using var _ = message;
        using var client = new SmtpClient(options.Host, options.Port)
        {
            EnableSsl = options.EnableSsl,
            Credentials = new System.Net.NetworkCredential(options.User, options.Password),
        };

        await client.SendMailAsync(message, cancellationToken);
    }
}
