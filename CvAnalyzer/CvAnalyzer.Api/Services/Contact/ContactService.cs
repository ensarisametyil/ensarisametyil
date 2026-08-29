using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Contact;

public class ContactService : IContactService
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _timeProvider;

    public ContactService(AppDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task SubmitAsync(Guid? userId, string name, string email, string subject, string message, CancellationToken cancellationToken = default)
    {
        _db.ContactMessages.Add(new ContactMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name.Trim(),
            Email = email.Trim(),
            Subject = subject.Trim(),
            Message = message.Trim(),
            CreatedAt = _timeProvider.GetUtcNow().UtcDateTime,
        });

        await _db.SaveChangesAsync(cancellationToken);
    }
}
