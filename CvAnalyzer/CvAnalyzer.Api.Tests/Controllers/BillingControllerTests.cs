using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos.Billing;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Controllers;

public class BillingControllerTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTime CurrentPeriodStart = new(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime CurrentPeriodEnd = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static BillingController CreateController(AppDbContext db, Guid userId, int freeLimit = 2)
    {
        var quotaService = new AnalysisQuotaService(
            db,
            new SubscriptionService(db, new FakeTimeProvider(Now)),
            new PlanCatalog(Options.Create(new PlanOptions { FreeMonthlyAnalysisLimit = freeLimit })),
            new UserOperationLock(),
            new FakeTimeProvider(Now));

        var controller = new BillingController(quotaService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = TestPrincipal.ForUser(userId) },
        };
        return controller;
    }

    [Fact]
    public async Task GetUsage_NewUser_ReturnsFreeWithZeroUsed()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, Guid.NewGuid());

        var response = await controller.GetUsage(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var dto = Assert.IsType<UsageDto>(ok.Value);
        Assert.Equal("FREE", dto.Plan);
        Assert.Equal(0, dto.Used);
        Assert.Equal(2, dto.Limit);
        Assert.Equal(2, dto.Remaining);
    }

    [Fact]
    public async Task GetUsage_OnlyReflectsTheCallingUsersOwnUsage_NeverAnotherUsers()
    {
        using var db = CreateDbContext();
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();

        db.AnalysisUsages.Add(new AnalysisUsage
        {
            Id = Guid.NewGuid(),
            UserId = userA,
            AnalysisId = Guid.NewGuid(),
            PeriodStart = CurrentPeriodStart,
            PeriodEnd = CurrentPeriodEnd,
            CreatedAt = CurrentPeriodStart,
        });
        await db.SaveChangesAsync();

        var controllerForB = CreateController(db, userB);

        var response = await controllerForB.GetUsage(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var dto = Assert.IsType<UsageDto>(ok.Value);
        // User A's usage must never leak into user B's summary.
        Assert.Equal(0, dto.Used);
    }

    [Fact]
    public async Task GetUsage_PremiumUser_ReturnsPremiumPlanName()
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
        await db.SaveChangesAsync();
        var controller = CreateController(db, userId);

        var response = await controller.GetUsage(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var dto = Assert.IsType<UsageDto>(ok.Value);
        Assert.Equal("PREMIUM", dto.Plan);
    }

    [Fact]
    public void BillingController_ExposesNoWayToSetOrChangeAPlan()
    {
        // Security requirement: a client can never set its own plan/subscription. Asserted at
        // the type level so this can never silently regress — the controller must never grow a
        // POST/PUT/PATCH/DELETE action, only read-only GETs.
        var mutatingVerbAttributes = new[] { typeof(HttpPostAttribute), typeof(HttpPutAttribute), typeof(HttpPatchAttribute), typeof(HttpDeleteAttribute) };

        var methods = typeof(BillingController).GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly);

        foreach (var method in methods)
        {
            var hasMutatingVerb = method.GetCustomAttributes(inherit: true)
                .Any(attribute => mutatingVerbAttributes.Contains(attribute.GetType()));
            Assert.False(hasMutatingVerb, $"{method.Name} must not accept a mutating HTTP verb.");
        }
    }
}
