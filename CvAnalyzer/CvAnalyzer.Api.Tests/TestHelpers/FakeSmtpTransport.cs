using System.Net.Mail;
using CvAnalyzer.Api.Services.Email;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Records every MailMessage instead of opening a real SMTP connection — see ISmtpTransport's doc comment. Never touches the network.</summary>
public class FakeSmtpTransport : ISmtpTransport
{
    public List<MailMessage> SentMessages { get; } = [];

    /// <summary>When set, SendAsync throws this instead of recording — simulates a network/credential failure.</summary>
    public Exception? ThrowOnSend { get; set; }

    public Task SendAsync(MailMessage message, SmtpOptions options, CancellationToken cancellationToken)
    {
        if (ThrowOnSend is not null)
        {
            throw ThrowOnSend;
        }

        SentMessages.Add(message);
        return Task.CompletedTask;
    }
}
