using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Billing;

public class AnalysisQuotaServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTime CurrentPeriodStart = new(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime CurrentPeriodEnd = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDbContext(string? name = null) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(name ?? Guid.NewGuid().ToString()).Options);

    private static AnalysisQuotaService CreateSut(
        AppDbContext db,
        TimeProvider timeProvider,
        int freeLimit = 2,
        int? premiumLimit = null,
        IUserOperationLock? userLock = null)
    {
        var options = Options.Create(new PlanOptions { FreeMonthlyAnalysisLimit = freeLimit, PremiumMonthlyAnalysisLimit = premiumLimit });
        return new AnalysisQuotaService(
            db,
            new SubscriptionService(db, timeProvider),
            new PlanCatalog(options),
            userLock ?? new UserOperationLock(),
            timeProvider);
    }

    private static async Task SeedUsageAsync(AppDbContext db, Guid userId, int count, DateTime periodStart, DateTime periodEnd)
    {
        for (var i = 0; i < count; i++)
        {
            db.AnalysisUsages.Add(new AnalysisUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AnalysisId = Guid.NewGuid(),
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                CreatedAt = periodStart,
            });
        }

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task EnsureUserCanAnalyzeAsync_FreeUserUnderLimit_DoesNotThrow()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        await SeedUsageAsync(db, userId, count: 1, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), freeLimit: 2);

        await sut.EnsureUserCanAnalyzeAsync(userId);
    }

    [Fact]
    public async Task EnsureUserCanAnalyzeAsync_FreeUserAtLimit_Throws()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        await SeedUsageAsync(db, userId, count: 2, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), freeLimit: 2);

        await Assert.ThrowsAsync<AnalysisQuotaExceededException>(() => sut.EnsureUserCanAnalyzeAsync(userId));
    }

    [Fact]
    public async Task EnsureUserCanAnalyzeAsync_UnlimitedPremiumUser_NeverThrowsRegardlessOfUsage()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = CurrentPeriodStart,
            CreatedAt = CurrentPeriodStart,
            UpdatedAt = CurrentPeriodStart,
        });
        await SeedUsageAsync(db, userId, count: 50, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), premiumLimit: null);

        await sut.EnsureUserCanAnalyzeAsync(userId);
    }

    [Fact]
    public async Task EnsureUserCanAnalyzeAsync_PremiumUserWithConfiguredNumericLimit_EnforcesIt()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = CurrentPeriodStart,
            CreatedAt = CurrentPeriodStart,
            UpdatedAt = CurrentPeriodStart,
        });
        await SeedUsageAsync(db, userId, count: 5, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), premiumLimit: 5);

        await Assert.ThrowsAsync<AnalysisQuotaExceededException>(() => sut.EnsureUserCanAnalyzeAsync(userId));
    }

    [Fact]
    public async Task RecordAnalysisUsageAsync_InsertsARowCountedByGetUsageSummary()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        var sut = CreateSut(db, new FakeTimeProvider(Now), freeLimit: 2);

        await sut.RecordAnalysisUsageAsync(userId, Guid.NewGuid());
        var summary = await sut.GetUsageSummaryAsync(userId);

        Assert.Equal(1, summary.Used);
    }

    [Fact]
    public async Task RecordAnalysisUsageAsync_WhenAlreadyAtLimit_ThrowsAndDoesNotInsertARow()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        await SeedUsageAsync(db, userId, count: 2, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), freeLimit: 2);

        await Assert.ThrowsAsync<AnalysisQuotaExceededException>(() => sut.RecordAnalysisUsageAsync(userId, Guid.NewGuid()));

        Assert.Equal(2, await db.AnalysisUsages.CountAsync(u => u.UserId == userId));
    }

    [Fact]
    public async Task RecordAnalysisUsageAsync_UsageFromAPastPeriod_DoesNotCountTowardCurrentPeriodLimit()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        var julyStart = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);
        var julyEnd = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
        // Two July usages would exhaust a limit-of-2 free plan if periods were conflated with August.
        await SeedUsageAsync(db, userId, count: 2, julyStart, julyEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), freeLimit: 2);

        await sut.EnsureUserCanAnalyzeAsync(userId);
        var summary = await sut.GetUsageSummaryAsync(userId);
        Assert.Equal(0, summary.Used);
    }

    [Fact]
    public async Task RecordAnalysisUsageAsync_ConcurrentCallsWithOneCreditRemaining_OnlyOneSucceeds()
    {
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var timeProvider = new FakeTimeProvider(Now);
        var sharedLock = new UserOperationLock();

        using (var seedDb = CreateDbContext(dbName))
        {
            // Free limit 2, one credit already used -> exactly one credit remains.
            await SeedUsageAsync(seedDb, userId, count: 1, CurrentPeriodStart, CurrentPeriodEnd);
        }

        using var db1 = CreateDbContext(dbName);
        using var db2 = CreateDbContext(dbName);
        var sut1 = CreateSut(db1, timeProvider, freeLimit: 2, userLock: sharedLock);
        var sut2 = CreateSut(db2, timeProvider, freeLimit: 2, userLock: sharedLock);

        var results = await Task.WhenAll(
            TryRecordAsync(sut1, userId),
            TryRecordAsync(sut2, userId));

        Assert.Equal(1, results.Count(succeeded => succeeded));
        Assert.Equal(1, results.Count(succeeded => !succeeded));

        using var verifyDb = CreateDbContext(dbName);
        var totalUsed = await verifyDb.AnalysisUsages.CountAsync(u => u.UserId == userId && u.PeriodStart == CurrentPeriodStart);
        Assert.Equal(2, totalUsed); // the 1 seeded + exactly 1 more — never 3
    }

    private static async Task<bool> TryRecordAsync(IAnalysisQuotaService sut, Guid userId)
    {
        try
        {
            await sut.RecordAnalysisUsageAsync(userId, Guid.NewGuid());
            return true;
        }
        catch (AnalysisQuotaExceededException)
        {
            return false;
        }
    }

    [Fact]
    public async Task GetUsageSummaryAsync_FreeUser_ReturnsUsedLimitAndRemaining()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        await SeedUsageAsync(db, userId, count: 1, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), freeLimit: 2);

        var summary = await sut.GetUsageSummaryAsync(userId);

        Assert.Equal(PlanType.Free, summary.Plan);
        Assert.Equal(1, summary.Used);
        Assert.Equal(2, summary.Limit);
        Assert.Equal(1, summary.Remaining);
        Assert.Equal(CurrentPeriodStart, summary.PeriodStart);
        Assert.Equal(CurrentPeriodEnd, summary.PeriodEnd);
    }

    [Fact]
    public async Task GetUsageSummaryAsync_UnlimitedPremiumUser_LimitAndRemainingAreNull()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = CurrentPeriodStart,
            CreatedAt = CurrentPeriodStart,
            UpdatedAt = CurrentPeriodStart,
        });
        await SeedUsageAsync(db, userId, count: 15, CurrentPeriodStart, CurrentPeriodEnd);
        var sut = CreateSut(db, new FakeTimeProvider(Now), premiumLimit: null);

        var summary = await sut.GetUsageSummaryAsync(userId);

        Assert.Equal(PlanType.Premium, summary.Plan);
        Assert.Equal(15, summary.Used);
        Assert.Null(summary.Limit);
        Assert.Null(summary.Remaining);
    }
}
