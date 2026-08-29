using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Services.Contact;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Services.Contact;

public class ContactServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task SubmitAsync_ValidMessage_GenuinelyPersistsARow()
    {
        using var db = CreateDbContext();
        var sut = new ContactService(db, new FakeTimeProvider(Now));

        await sut.SubmitAsync(null, "Ada Lovelace", "ada@example.com", "Soru", "Merhaba, bir sorum var.");

        var saved = Assert.Single(db.ContactMessages);
        Assert.Equal("Ada Lovelace", saved.Name);
        Assert.Equal("ada@example.com", saved.Email);
        Assert.Equal("Soru", saved.Subject);
        Assert.Equal("Merhaba, bir sorum var.", saved.Message);
        Assert.Null(saved.UserId);
        Assert.Equal(Now.UtcDateTime, saved.CreatedAt);
    }

    [Fact]
    public async Task SubmitAsync_AuthenticatedSender_AttributesTheMessageToThem()
    {
        using var db = CreateDbContext();
        var sut = new ContactService(db, new FakeTimeProvider(Now));
        var userId = Guid.NewGuid();

        await sut.SubmitAsync(userId, "Ada", "ada@example.com", "Soru", "Mesaj");

        Assert.Equal(userId, db.ContactMessages.Single().UserId);
    }

    [Fact]
    public async Task SubmitAsync_TrimsWhitespaceFromFields()
    {
        using var db = CreateDbContext();
        var sut = new ContactService(db, new FakeTimeProvider(Now));

        await sut.SubmitAsync(null, "  Ada  ", "  ada@example.com  ", "  Soru  ", "  Mesaj  ");

        var saved = db.ContactMessages.Single();
        Assert.Equal("Ada", saved.Name);
        Assert.Equal("ada@example.com", saved.Email);
    }
}
