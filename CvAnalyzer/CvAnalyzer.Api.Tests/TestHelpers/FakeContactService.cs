using CvAnalyzer.Api.Services.Contact;

namespace CvAnalyzer.Api.Tests.TestHelpers;

public class FakeContactService : IContactService
{
    public int SubmitCallCount { get; private set; }

    public Guid? LastUserId { get; private set; }

    public Task SubmitAsync(Guid? userId, string name, string email, string subject, string message, CancellationToken cancellationToken = default)
    {
        SubmitCallCount++;
        LastUserId = userId;
        return Task.CompletedTask;
    }
}
