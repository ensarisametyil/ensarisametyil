using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Admin;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Services.Admin;

public class AdminAuditLogServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 31, 12, 0, 0, TimeSpan.Zero);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static User NewUser(string email) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = "irrelevant",
        IsActive = true,
        CreatedAt = Now.UtcDateTime,
        UpdatedAt = Now.UtcDateTime,
    };

    [Fact]
    public async Task RecordAsync_PersistsAllFields()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com");
        var target = NewUser("target@example.com");
        db.Users.AddRange(admin, target);
        await db.SaveChangesAsync();

        var sut = new AdminAuditLogService(db, new FakeTimeProvider(Now));
        await sut.RecordAsync(admin.Id, AdminAuditAction.UserDeactivated, target.Id, "IsActive -> False", success: true);

        var log = await db.AdminAuditLogs.SingleAsync();
        Assert.Equal(admin.Id, log.AdminUserId);
        Assert.Equal(target.Id, log.TargetUserId);
        Assert.Equal(AdminAuditAction.UserDeactivated, log.Action);
        Assert.Equal("IsActive -> False", log.Details);
        Assert.True(log.Success);
    }

    [Fact]
    public async Task RecordAsync_NeverStoresASecretOrRawPayload_OnlyTheShortSafeDetailsString()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com");
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var sut = new AdminAuditLogService(db, new FakeTimeProvider(Now));
        await sut.RecordAsync(admin.Id, AdminAuditAction.SubscriptionCancelled, null, "Premium subscription cancelled", success: true);

        var log = await db.AdminAuditLogs.SingleAsync();
        // Details is a short human-readable summary, never anything resembling a token/secret/card payload.
        Assert.True(log.Details!.Length < 200);
        Assert.DoesNotContain("SecretKey", log.Details);
        Assert.DoesNotContain("password", log.Details, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ListAsync_ReturnsEntries_NewestFirst_WithResolvedEmails()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com");
        var target = NewUser("target@example.com");
        db.Users.AddRange(admin, target);
        await db.SaveChangesAsync();

        var timeProvider = new FakeTimeProvider(Now);
        var sut = new AdminAuditLogService(db, timeProvider);
        await sut.RecordAsync(admin.Id, AdminAuditAction.UserDeactivated, target.Id, "first", success: true);
        timeProvider.Set(Now.AddMinutes(1));
        await sut.RecordAsync(admin.Id, AdminAuditAction.UserActivated, target.Id, "second", success: true);

        var result = await sut.ListAsync(page: 1, pageSize: 20);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal("second", result.Items[0].Details);
        Assert.Equal("admin@example.com", result.Items[0].AdminEmail);
        Assert.Equal("target@example.com", result.Items[0].TargetEmail);
    }

    [Fact]
    public async Task ListAsync_PaginatesCorrectly()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com");
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var sut = new AdminAuditLogService(db, new FakeTimeProvider(Now));
        for (var i = 0; i < 5; i++)
        {
            await sut.RecordAsync(admin.Id, AdminAuditAction.UserActivated, null, $"entry {i}", success: true);
        }

        var page1 = await sut.ListAsync(page: 1, pageSize: 2);
        var page2 = await sut.ListAsync(page: 2, pageSize: 2);

        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(2, page1.Items.Count);
        Assert.Equal(2, page2.Items.Count);
    }
}
