using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Services.Billing;

public class SubscriptionServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static SubscriptionService CreateSut(AppDbContext db) => new(db, new FakeTimeProvider(Now));

    [Fact]
    public async Task GetEffectivePlanAsync_NoSubscriptionRow_ReturnsFree()
    {
        using var db = CreateDbContext();
        var sut = CreateSut(db);

        var plan = await sut.GetEffectivePlanAsync(Guid.NewGuid());

        Assert.Equal(PlanType.Free, plan);
    }

    [Fact]
    public async Task GetEffectivePlanAsync_ActivePremiumSubscription_ReturnsPremium()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddDays(-10),
            EndDate = null,
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        var plan = await sut.GetEffectivePlanAsync(userId);

        Assert.Equal(PlanType.Premium, plan);
    }

    [Theory]
    [InlineData(SubscriptionStatus.Cancelled)]
    [InlineData(SubscriptionStatus.Expired)]
    [InlineData(SubscriptionStatus.PastDue)]
    [InlineData(SubscriptionStatus.Pending)]
    public async Task GetEffectivePlanAsync_NonActiveSubscription_ReturnsFree(SubscriptionStatus status)
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = status,
            StartDate = Now.UtcDateTime.AddDays(-10),
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        var plan = await sut.GetEffectivePlanAsync(userId);

        Assert.Equal(PlanType.Free, plan);
    }

    [Fact]
    public async Task GetEffectivePlanAsync_SubscriptionEndDateInThePast_ReturnsFree()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddMonths(-2),
            EndDate = Now.UtcDateTime.AddDays(-1),
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        var plan = await sut.GetEffectivePlanAsync(userId);

        Assert.Equal(PlanType.Free, plan);
    }

    [Fact]
    public async Task GetEffectivePlanAsync_SubscriptionNotYetStarted_ReturnsFree()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddDays(1),
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        var plan = await sut.GetEffectivePlanAsync(userId);

        Assert.Equal(PlanType.Free, plan);
    }

    [Fact]
    public async Task GetEffectivePlanAsync_OnlyChecksRequestedUsersSubscription()
    {
        using var db = CreateDbContext();
        var premiumUser = Guid.NewGuid();
        var otherUser = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = premiumUser,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddDays(-1),
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();
        var sut = CreateSut(db);

        var otherUsersPlan = await sut.GetEffectivePlanAsync(otherUser);

        Assert.Equal(PlanType.Free, otherUsersPlan);
    }
}
