using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Admin;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Admin;

public class AdminUserServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 31, 12, 0, 0, TimeSpan.Zero);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static AdminUserService CreateSut(AppDbContext db, TimeProvider? timeProvider = null, IPaymentService? paymentService = null)
    {
        var tp = timeProvider ?? new FakeTimeProvider(Now);
        var subscriptionService = new SubscriptionService(db, tp);
        var quotaService = new AnalysisQuotaService(db, subscriptionService, new PlanCatalog(Options.Create(new PlanOptions())), new UserOperationLock(), tp);
        var auditLog = new AdminAuditLogService(db, tp);
        return new AdminUserService(db, subscriptionService, quotaService, paymentService ?? new FakePaymentService(), auditLog, tp);
    }

    private static User NewUser(string email, DateTime createdAt, UserRole role = UserRole.User) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = "irrelevant",
        Role = role,
        IsActive = true,
        CreatedAt = createdAt,
        UpdatedAt = createdAt,
    };

    [Fact]
    public async Task ListUsersAsync_ReturnsPagedResults_NewestFirst()
    {
        using var db = CreateDbContext();
        var older = NewUser("older@example.com", Now.UtcDateTime.AddDays(-2));
        var newer = NewUser("newer@example.com", Now.UtcDateTime.AddDays(-1));
        db.Users.AddRange(older, newer);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.ListUsersAsync(page: 1, pageSize: 20, search: null);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(newer.Id, result.Items[0].Id);
        Assert.Equal(older.Id, result.Items[1].Id);
    }

    [Fact]
    public async Task ListUsersAsync_PaginatesCorrectly_NeverReturningMoreThanPageSize()
    {
        using var db = CreateDbContext();
        for (var i = 0; i < 5; i++)
        {
            db.Users.Add(NewUser($"user{i}@example.com", Now.UtcDateTime.AddMinutes(-i)));
        }
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var page1 = await sut.ListUsersAsync(page: 1, pageSize: 2, search: null);
        var page2 = await sut.ListUsersAsync(page: 2, pageSize: 2, search: null);

        Assert.Equal(5, page1.TotalCount);
        Assert.Equal(2, page1.Items.Count);
        Assert.Equal(2, page2.Items.Count);
        Assert.DoesNotContain(page1.Items, i => page2.Items.Any(j => j.Id == i.Id));
    }

    [Fact]
    public async Task ListUsersAsync_SearchFiltersByEmailSubstring()
    {
        using var db = CreateDbContext();
        db.Users.AddRange(
            NewUser("ada@example.com", Now.UtcDateTime),
            NewUser("grace@example.com", Now.UtcDateTime));
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.ListUsersAsync(page: 1, pageSize: 20, search: "ada");

        Assert.Single(result.Items);
        Assert.Equal("ada@example.com", result.Items[0].Email);
    }

    [Fact]
    public async Task ListUsersAsync_MarksPremiumPlan_OnlyForUsersWithAnActiveSubscription()
    {
        using var db = CreateDbContext();
        var premiumUser = NewUser("premium@example.com", Now.UtcDateTime);
        var freeUser = NewUser("free@example.com", Now.UtcDateTime);
        db.Users.AddRange(premiumUser, freeUser);
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = premiumUser.Id,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddDays(-1),
            EndDate = null,
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.ListUsersAsync(page: 1, pageSize: 20, search: null);

        Assert.Equal("Premium", result.Items.Single(u => u.Id == premiumUser.Id).Plan);
        Assert.Equal("Free", result.Items.Single(u => u.Id == freeUser.Id).Plan);
    }

    [Fact]
    public async Task GetUserDetailAsync_ReturnsNull_ForNonexistentUser()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        var result = await sut.GetUserDetailAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserDetailAsync_ReturnsFreeUserDetail_WithNoSubscriptionHistory()
    {
        using var db = CreateDbContext();
        var user = NewUser("free@example.com", Now.UtcDateTime);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.GetUserDetailAsync(user.Id);

        Assert.NotNull(result);
        Assert.Equal("Free", result!.Plan);
        Assert.Null(result.SubscriptionStatus);
        Assert.Equal("User", result.Role.ToString());
    }

    [Fact]
    public async Task GetUserDetailAsync_IncludesThatUsersPaymentHistory_FromThePaymentService()
    {
        using var db = CreateDbContext();
        var user = NewUser("paid@example.com", Now.UtcDateTime);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var fakePaymentService = new FakePaymentService
        {
            PaymentHistory = new[] { new CvAnalyzer.Api.Services.Billing.Payments.PaymentTransactionSummary(Now.UtcDateTime, "Succeeded", "Iyzico", "sub-1", 10.00m, "USD") },
        };
        var sut = CreateSut(db, paymentService: fakePaymentService);

        var result = await sut.GetUserDetailAsync(user.Id);

        Assert.NotNull(result);
        Assert.Single(result!.Payments);
        Assert.Equal(10.00m, result.Payments[0].Amount);
    }

    [Fact]
    public async Task SetUserActiveAsync_DeactivatesUser_AndRecordsAnAuditLogEntry()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com", Now.UtcDateTime, UserRole.Admin);
        var target = NewUser("target@example.com", Now.UtcDateTime);
        db.Users.AddRange(admin, target);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.SetUserActiveAsync(admin.Id, target.Id, isActive: false);

        Assert.True(result.Success);
        var updated = await db.Users.SingleAsync(u => u.Id == target.Id);
        Assert.False(updated.IsActive);

        var logs = await db.AdminAuditLogs.ToListAsync();
        Assert.Single(logs);
        Assert.Equal(AdminAuditAction.UserDeactivated, logs[0].Action);
        Assert.Equal(admin.Id, logs[0].AdminUserId);
        Assert.Equal(target.Id, logs[0].TargetUserId);
        Assert.True(logs[0].Success);
    }

    [Fact]
    public async Task SetUserActiveAsync_AdminCannotTargetTheirOwnAccount()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com", Now.UtcDateTime, UserRole.Admin);
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.SetUserActiveAsync(admin.Id, admin.Id, isActive: false);

        Assert.False(result.Success);
        var stillThere = await db.Users.SingleAsync(u => u.Id == admin.Id);
        Assert.True(stillThere.IsActive);
    }

    [Fact]
    public async Task SetUserActiveAsync_NonexistentTarget_ReturnsFailure()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com", Now.UtcDateTime, UserRole.Admin);
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.SetUserActiveAsync(admin.Id, Guid.NewGuid(), isActive: false);

        Assert.False(result.Success);
    }

    [Fact]
    public async Task SetUserRoleAsync_ChangesRole_AndRecordsAnAuditLogEntry()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com", Now.UtcDateTime, UserRole.Admin);
        var target = NewUser("target@example.com", Now.UtcDateTime);
        db.Users.AddRange(admin, target);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.SetUserRoleAsync(admin.Id, target.Id, UserRole.Admin);

        Assert.True(result.Success);
        var updated = await db.Users.SingleAsync(u => u.Id == target.Id);
        Assert.Equal(UserRole.Admin, updated.Role);

        var log = await db.AdminAuditLogs.SingleAsync();
        Assert.Equal(AdminAuditAction.UserRoleChanged, log.Action);
        Assert.Contains("Admin", log.Details);
    }

    [Fact]
    public async Task SetUserRoleAsync_AdminCannotChangeTheirOwnRole()
    {
        using var db = CreateDbContext();
        var admin = NewUser("admin@example.com", Now.UtcDateTime, UserRole.Admin);
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var sut = CreateSut(db);
        var result = await sut.SetUserRoleAsync(admin.Id, admin.Id, UserRole.User);

        Assert.False(result.Success);
        var stillAdmin = await db.Users.SingleAsync(u => u.Id == admin.Id);
        Assert.Equal(UserRole.Admin, stillAdmin.Role);
    }
}
