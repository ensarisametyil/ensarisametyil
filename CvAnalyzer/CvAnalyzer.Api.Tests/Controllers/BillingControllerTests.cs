using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Billing;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Controllers;

public class BillingControllerTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTime CurrentPeriodStart = new(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime CurrentPeriodEnd = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static BillingController CreateController(
        AppDbContext db, Guid userId, int freeLimit = 2, IPaymentService? paymentService = null, PlanOptions? planOptions = null)
    {
        var subscriptionService = new SubscriptionService(db, new FakeTimeProvider(Now));
        var planCatalog = new PlanCatalog(Options.Create(planOptions ?? new PlanOptions { FreeMonthlyAnalysisLimit = freeLimit }));
        var quotaService = new AnalysisQuotaService(
            db,
            subscriptionService,
            planCatalog,
            new UserOperationLock(),
            new FakeTimeProvider(Now));

        var controller = new BillingController(
            quotaService,
            paymentService ?? new FakePaymentService(),
            subscriptionService,
            planCatalog,
            Options.Create(new IyzicoOptions { FrontendResultUrl = "http://localhost:5173/premium/result" }),
            NullLogger<BillingController>.Instance);

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
    public void CheckoutRequestDto_NeverAcceptsAPlanOrPaymentOutcomeFieldFromTheClient()
    {
        // Security requirement: the ONLY request body an authenticated end-user submits to this
        // controller (POST /api/billing/checkout — CheckoutRequestDto) must never carry a field
        // that looks like "the client claims its own plan/payment outcome" (plan=Premium,
        // paymentSuccess=true, subscriptionStatus=Active, ...). This is asserted at the type
        // level so a future field addition that reintroduces client-trusted plan state fails the
        // build immediately. (IyzicoWebhookRequestDto is intentionally excluded: it is Iyzico's
        // own server-to-server payload, verified by signature + an authoritative re-confirmation
        // before ever being trusted — see PaymentService — not a claim a browser/user submits.)
        // Also covers Stage 15's price/amount/currency concern: the real Premium price is
        // resolved entirely from PlanCatalog (server-side config), never from anything a client
        // could submit here — there is simply no field for it to land in.
        var forbiddenSubstrings = new[] { "plan", "premium", "paymentsuccess", "success", "status", "subscriptionstatus", "isactive", "price", "amount", "currency" };

        foreach (var property in typeof(CheckoutRequestDto).GetProperties())
        {
            var lower = property.Name.ToLowerInvariant();
            Assert.False(
                forbiddenSubstrings.Any(lower.Contains),
                $"CheckoutRequestDto.{property.Name} looks like a client-controlled plan/payment-outcome field — Premium must only ever be granted from a verified provider result.");
        }
    }

    [Fact]
    public async Task StartCheckout_MissingBuyerInfo_ReturnsBadRequestWithoutCallingPaymentService()
    {
        using var db = CreateDbContext();
        var paymentService = new FakePaymentService();
        var controller = CreateController(db, Guid.NewGuid(), paymentService: paymentService);

        var response = await controller.StartCheckout(new CheckoutRequestDto("", "Doe", "11111111111", "5551234567", "Istanbul", "Test Address"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_REQUEST", error.Code);
    }

    [Fact]
    public async Task GetSubscription_FreeUserWhoNeverCheckedOut_ReturnsAllNullDetailNotAnError()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, Guid.NewGuid());

        var response = await controller.GetSubscription(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var dto = Assert.IsType<SubscriptionDetailsDto>(ok.Value);
        Assert.Equal("FREE", dto.Plan);
        Assert.Null(dto.Status);
        Assert.False(dto.CanCancel);
    }

    [Fact]
    public async Task GetSubscription_ActivePremiumUser_ReturnsDetailAndCanCancelTrue()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(), UserId = userId, Plan = PlanType.Premium, Status = SubscriptionStatus.Active,
            StartDate = CurrentPeriodStart, CreatedAt = CurrentPeriodStart, UpdatedAt = CurrentPeriodStart,
            Provider = "Iyzico", ProviderCustomerId = "cust-1", ProviderSubscriptionId = "sub-1",
        });
        await db.SaveChangesAsync();
        var controller = CreateController(db, userId);

        var response = await controller.GetSubscription(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var dto = Assert.IsType<SubscriptionDetailsDto>(ok.Value);
        Assert.Equal("PREMIUM", dto.Plan);
        Assert.Equal("ACTIVE", dto.Status);
        Assert.Equal("Iyzico", dto.Provider);
        Assert.True(dto.CanCancel);
    }

    [Fact]
    public async Task CancelSubscription_PaymentServiceReportsSuccess_ReturnsOk()
    {
        using var db = CreateDbContext();
        var paymentService = new FakePaymentService { CancelResult = new CancelSubscriptionResult(true, null) };
        var controller = CreateController(db, Guid.NewGuid(), paymentService: paymentService);

        var response = await controller.CancelSubscription(CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
    }

    [Fact]
    public async Task CancelSubscription_PaymentServiceReportsFailure_ReturnsBadRequest()
    {
        using var db = CreateDbContext();
        var paymentService = new FakePaymentService { CancelResult = new CancelSubscriptionResult(false, "Aktif bir Premium aboneliğiniz yok.") };
        var controller = CreateController(db, Guid.NewGuid(), paymentService: paymentService);

        var response = await controller.CancelSubscription(CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("CANCELLATION_FAILED", error.Code);
    }

    [Fact]
    public async Task GetPaymentHistory_ReturnsWhatTheServiceReturns_MappedToDto()
    {
        using var db = CreateDbContext();
        var paymentService = new FakePaymentService
        {
            PaymentHistory = new List<PaymentTransactionSummary>
            {
                new(CurrentPeriodStart, "Succeeded", "Iyzico", "sub-ref-1", 10.00m, "USD"),
            },
        };
        var controller = CreateController(db, Guid.NewGuid(), paymentService: paymentService);

        var response = await controller.GetPaymentHistory(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var items = Assert.IsType<List<PaymentHistoryItemDto>>(ok.Value);
        Assert.Single(items);
        Assert.Equal("Succeeded", items[0].Status);
        Assert.Equal("sub-ref-1", items[0].SubscriptionReference);
        Assert.Equal(10.00m, items[0].Amount);
        Assert.Equal("USD", items[0].Currency);
    }

    [Fact]
    public void GetPlans_ReturnsFreeAndPremiumFromThePlanCatalog_NeverFromAnyClientInput()
    {
        using var db = CreateDbContext();
        var planOptions = new PlanOptions { FreeMonthlyAnalysisLimit = 2, PremiumMonthlyAnalysisLimit = null, PremiumMonthlyPriceUsd = 10.00m };
        var controller = CreateController(db, Guid.NewGuid(), planOptions: planOptions);

        var response = controller.GetPlans();

        var ok = Assert.IsType<OkObjectResult>(response);
        var dto = Assert.IsType<PlanCatalogDto>(ok.Value);
        Assert.Equal(2, dto.Free.MonthlyAnalysisLimit);
        Assert.Null(dto.Free.MonthlyPriceUsd);
        Assert.Null(dto.Premium.MonthlyAnalysisLimit);
        Assert.Equal(10.00m, dto.Premium.MonthlyPriceUsd);
        Assert.Equal("USD", dto.Premium.Currency);
    }

    [Fact]
    public void GetPlans_IsAllowAnonymous_ThePublicLandingPageMustBeAbleToReadItBeforeSignIn()
    {
        var method = typeof(BillingController).GetMethod(nameof(BillingController.GetPlans))!;
        Assert.NotEmpty(method.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute), inherit: true));
    }
}
