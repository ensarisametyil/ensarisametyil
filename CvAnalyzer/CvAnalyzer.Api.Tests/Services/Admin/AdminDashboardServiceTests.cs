using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Admin;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Services.Admin;

public class AdminDashboardServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 31, 12, 0, 0, TimeSpan.Zero);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static User NewUser(DateTime createdAt) => new()
    {
        Id = Guid.NewGuid(),
        Email = $"{Guid.NewGuid():N}@example.com",
        PasswordHash = "irrelevant",
        IsActive = true,
        CreatedAt = createdAt,
        UpdatedAt = createdAt,
    };

    [Fact]
    public async Task GetStatsAsync_CountsUsersSubscriptionsAndPayments()
    {
        using var db = CreateDbContext();
        var free = NewUser(Now.UtcDateTime.AddDays(-10));
        var premium = NewUser(Now.UtcDateTime.AddDays(-1));
        db.Users.AddRange(free, premium);
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = premium.Id,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddDays(-1),
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();

        var sut = new AdminDashboardService(db, new FakeTimeProvider(Now));
        var stats = await sut.GetStatsAsync();

        Assert.Equal(2, stats.TotalUsers);
        Assert.Equal(1, stats.PremiumUsers);
        Assert.Equal(1, stats.FreeUsers);
        Assert.Equal(1, stats.ActiveSubscriptions);
        Assert.Equal(1, stats.NewUsersLast7Days);
    }

    [Fact]
    public async Task GetStatsAsync_RevenueIsSummedOnlyFromSucceededPayments_NeverFailedOrPending()
    {
        using var db = CreateDbContext();
        var user = NewUser(Now.UtcDateTime);
        db.Users.Add(user);
        db.PaymentTransactions.AddRange(
            NewTransaction(user.Id, PaymentTransactionStatus.Succeeded, 10.00m),
            NewTransaction(user.Id, PaymentTransactionStatus.Failed, 10.00m),
            NewTransaction(user.Id, PaymentTransactionStatus.Initiated, 10.00m));
        await db.SaveChangesAsync();

        var sut = new AdminDashboardService(db, new FakeTimeProvider(Now));
        var stats = await sut.GetStatsAsync();

        Assert.Equal(10.00m, stats.TotalRevenueUsd);
        Assert.Equal(1, stats.SucceededPayments);
        Assert.Equal(1, stats.FailedPayments);
        Assert.Equal(1, stats.PendingPayments);
    }

    [Fact]
    public async Task GetStatsAsync_RecentPayments_IncludesUpToFive_NewestFirst()
    {
        using var db = CreateDbContext();
        var user = NewUser(Now.UtcDateTime);
        db.Users.Add(user);
        for (var i = 0; i < 7; i++)
        {
            var t = NewTransaction(user.Id, PaymentTransactionStatus.Succeeded, 10.00m);
            t.CreatedAt = Now.UtcDateTime.AddMinutes(-i);
            db.PaymentTransactions.Add(t);
        }
        await db.SaveChangesAsync();

        var sut = new AdminDashboardService(db, new FakeTimeProvider(Now));
        var stats = await sut.GetStatsAsync();

        Assert.Equal(5, stats.RecentPayments.Count);
        Assert.True(stats.RecentPayments[0].CreatedAt >= stats.RecentPayments[^1].CreatedAt);
    }

    private static PaymentTransaction NewTransaction(Guid userId, PaymentTransactionStatus status, decimal amount) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        ConversationId = Guid.NewGuid().ToString(),
        Status = status,
        AmountUsd = amount,
        Currency = "USD",
        CreatedAt = Now.UtcDateTime,
    };
}
