namespace CvAnalyzer.Api.Services.Contact;

public interface IContactService
{
    /// <summary>
    /// Persists a contact message. This genuinely happens (a real row in a real table) — there is
    /// no email/notification delivery behind it yet (see docs/stage-10.md for why: no real
    /// SMTP/email provider is wired up in this environment, and this project never fabricates a
    /// "your message was sent" outcome that isn't backed by something real). Forwarding new
    /// messages to a support inbox is a documented production TODO.
    /// </summary>
    Task SubmitAsync(Guid? userId, string name, string email, string subject, string message, CancellationToken cancellationToken = default);
}
