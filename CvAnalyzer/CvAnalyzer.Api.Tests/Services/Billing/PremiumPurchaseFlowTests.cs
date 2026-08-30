using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Billing;

/// <summary>
/// Stage 15's end-to-end acceptance scenario, exercised across the real PaymentService and the
/// real AnalysisQuotaService sharing one database — proving the whole chain (checkout ->
/// verified callback -> Subscription row -> AnalysisQuotaService reading it) actually connects,
/// not just that each half individually behaves correctly in isolation.
/// </summary>
public class PremiumPurchaseFlowTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
    private static readonly CheckoutBuyerInfo Buyer = new("Ada", "Lovelace", "11111111111", "5551234567", "Istanbul", "Test Sk. No:1");

    private static AppDbContext CreateDbContext(string name) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(name).Options);

    private sealed record Sut(PaymentService Payment, AnalysisQuotaService Quota, FakePaymentProvider Provider);

    private static Sut CreateSut(AppDbContext db, FakeTimeProvider clock, PlanOptions planOptions, IUserOperationLock userLock)
    {
        var subscriptionService = new SubscriptionService(db, clock);
        var planCatalog = new PlanCatalog(Options.Create(planOptions));
        var provider = new FakePaymentProvider();
        var iyzicoOptions = new IyzicoOptions
        {
            ApiKey = "test-api-key",
            SecretKey = "test-only-secret-key-never-used-for-anything-real-0123456789",
            PremiumPricingPlanReferenceCode = "premium-monthly-plan",
            CallbackUrl = "http://localhost:5285/api/billing/checkout/callback",
            FrontendResultUrl = "http://localhost:5173/premium/result",
        };

        var payment = new PaymentService(
            db,
            provider,
            new IyzicoWebhookSignatureVerifier(Options.Create(iyzicoOptions)),
            subscriptionService,
            planCatalog,
            userLock,
            Options.Create(iyzicoOptions),
            clock,
            NullLogger<PaymentService>.Instance);

        var quota = new AnalysisQuotaService(db, subscriptionService, planCatalog, userLock, clock);

        return new Sut(payment, quota, provider);
    }

    [Fact]
    public async Task Test1_FreeUserBuysPremium_EndToEnd_ChecksOut_Verifies_ActivatesSubscription_AndUnlocksUnlimitedQuota()
    {
        using var db = CreateDbContext(nameof(Test1_FreeUserBuysPremium_EndToEnd_ChecksOut_Verifies_ActivatesSubscription_AndUnlocksUnlimitedQuota));
        var clock = new FakeTimeProvider(Now);
        var userLock = new UserOperationLock();
        var planOptions = new PlanOptions { FreeMonthlyAnalysisLimit = 2, PremiumMonthlyAnalysisLimit = null, PremiumMonthlyPriceUsd = 10.00m };
        var sut = CreateSut(db, clock, planOptions, userLock);
        var userId = Guid.NewGuid();

        // Starting point: a Free user who has already spent their 2 monthly credits.
        for (var i = 0; i < 2; i++)
        {
            await sut.Quota.RecordAnalysisUsageAsync(userId, Guid.NewGuid());
        }
        await Assert.ThrowsAsync<AnalysisQuotaExceededException>(() => sut.Quota.EnsureUserCanAnalyzeAsync(userId));

        // 1-5: user selects Premium, checkout starts, backend resolves the real $10 price.
        var checkout = await sut.Payment.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        Assert.True(checkout.Success);
        var transaction = db.PaymentTransactions.Single();
        Assert.Equal(10.00m, transaction.AmountUsd);

        // 6-10: Iyzico checkout (faked) + browser redirect back with the token.
        sut.Provider.CheckoutFormResult = new SubscriptionCheckoutResult(true, "sub-ref-e2e", "cust-ref-e2e", "ACTIVE", null);
        sut.Provider.RetrieveResult = new ProviderSubscriptionState(true, "ACTIVE", null);
        var callbackOutcome = await sut.Payment.ProcessCheckoutCallbackAsync(transaction.CheckoutToken!);

        // 10-11: backend verified the result server-to-server (never trusted the callback alone)
        // before activating.
        Assert.True(callbackOutcome.Success);
        Assert.Equal(1, sut.Provider.RetrieveCallCount);

        // 12: the subscription is Premium/Active.
        var subscription = db.Subscriptions.Single();
        Assert.Equal(PlanType.Premium, subscription.Plan);
        Assert.Equal(SubscriptionStatus.Active, subscription.Status);

        // 13: quota is now unlimited — the same AnalysisQuotaService that denied the 3rd analysis
        // a moment ago now allows it, having read nothing but the Subscription row PaymentService
        // itself just wrote.
        await sut.Quota.EnsureUserCanAnalyzeAsync(userId); // must not throw
        var summary = await sut.Quota.GetUsageSummaryAsync(userId);
        Assert.Equal(PlanType.Premium, summary.Plan);
        Assert.Null(summary.Limit);
        Assert.Null(summary.Remaining);
    }

    [Fact]
    public async Task Test2_FailedPayment_NeverActivatesPremiumOrGrantsQuota()
    {
        using var db = CreateDbContext(nameof(Test2_FailedPayment_NeverActivatesPremiumOrGrantsQuota));
        var clock = new FakeTimeProvider(Now);
        var planOptions = new PlanOptions { FreeMonthlyAnalysisLimit = 2, PremiumMonthlyAnalysisLimit = null, PremiumMonthlyPriceUsd = 10.00m };
        var sut = CreateSut(db, clock, planOptions, new UserOperationLock());
        var userId = Guid.NewGuid();

        var checkout = await sut.Payment.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var transaction = db.PaymentTransactions.Single();

        // Iyzico reports the payment did not succeed.
        sut.Provider.CheckoutFormResult = new SubscriptionCheckoutResult(false, null, null, null, "kart reddedildi");
        var outcome = await sut.Payment.ProcessCheckoutCallbackAsync(transaction.CheckoutToken!);

        Assert.True(checkout.Success); // checkout itself started fine — it is the payment result that failed
        Assert.False(outcome.Success);
        Assert.Empty(db.Subscriptions);
        var summary = await sut.Quota.GetUsageSummaryAsync(userId);
        Assert.Equal(PlanType.Free, summary.Plan);
        Assert.Equal(2, summary.Limit); // still the Free limit — nothing was ever granted
    }

    [Fact]
    public async Task Test3_UserCancelledBeforeCompletingPayment_NeverActivatesPremium()
    {
        // Iyzico's subscription checkout form has no distinct "user closed the tab" signal
        // separate from "the checkout form result is not a success" — there is nothing to poll,
        // no partial state, and (if the browser is never redirected back at all) no callback is
        // ever received. Whether the buyer explicitly declined or simply abandoned the flow, this
        // ProcessCheckoutCallbackAsync(false) path is the only one Iyzico's API can produce, and
        // it must behave exactly like Test2: no Premium, no quota change.
        using var db = CreateDbContext(nameof(Test3_UserCancelledBeforeCompletingPayment_NeverActivatesPremium));
        var clock = new FakeTimeProvider(Now);
        var planOptions = new PlanOptions { FreeMonthlyAnalysisLimit = 2, PremiumMonthlyAnalysisLimit = null, PremiumMonthlyPriceUsd = 10.00m };
        var sut = CreateSut(db, clock, planOptions, new UserOperationLock());
        var userId = Guid.NewGuid();

        var checkout = await sut.Payment.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var transaction = db.PaymentTransactions.Single();

        sut.Provider.CheckoutFormResult = new SubscriptionCheckoutResult(false, null, null, null, "kullanıcı ödeme adımını tamamlamadan ayrıldı");
        var outcome = await sut.Payment.ProcessCheckoutCallbackAsync(transaction.CheckoutToken!);

        Assert.True(checkout.Success);
        Assert.False(outcome.Success);
        Assert.Empty(db.Subscriptions);
        Assert.Equal(PaymentTransactionStatus.Failed, db.PaymentTransactions.Single().Status);
    }
}
