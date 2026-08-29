namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// A message submitted through the public /contact form. Genuinely persisted (never a fake
/// "sent" response with nothing behind it) — forwarding it to a real inbox/ticketing system is a
/// production integration left as an explicit TODO (see docs/stage-10.md) rather than a fabricated
/// SMTP/email provider wired up without real credentials.
/// </summary>
public class ContactMessage
{
    public Guid Id { get; set; }

    /// <summary>Set when the sender was authenticated at submission time — null for an anonymous visitor.</summary>
    public Guid? UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}
