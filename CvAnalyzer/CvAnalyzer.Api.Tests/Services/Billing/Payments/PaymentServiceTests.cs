using System.Security.Cryptography;
using System.Text;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Billing.Payments;

public class PaymentServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
    private const string TestSecretKey = "test-only-secret-key-never-used-for-anything-real-0123456789";

    private static readonly CheckoutBuyerInfo Buyer = new("Ada", "Lovelace", "11111111111", "5551234567", "Istanbul", "Test Sk. No:1");

    private static AppDbContext CreateDbContext(string? dbName = null) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString()).Options);

    private static IyzicoOptions CreateOptions() => new()
    {
        ApiKey = "test-api-key",
        SecretKey = TestSecretKey,
        PremiumPricingPlanReferenceCode = "premium-monthly-plan",
        CallbackUrl = "http://localhost:5285/api/billing/checkout/callback",
        FrontendResultUrl = "http://localhost:5173/premium/result",
    };

    private static (PaymentService Sut, FakePaymentProvider Provider, AppDbContext Db, FakeTimeProvider Clock) CreateSut(
        IyzicoOptions? options = null, IUserOperationLock? userLock = null, PlanOptions? planOptions = null, string? dbName = null)
    {
        var db = CreateDbContext(dbName);
        var provider = new FakePaymentProvider();
        var opts = options ?? CreateOptions();
        var clock = new FakeTimeProvider(Now);
        var sut = new PaymentService(
            db,
            provider,
            new IyzicoWebhookSignatureVerifier(Options.Create(opts)),
            new SubscriptionService(db, clock),
            new PlanCatalog(Options.Create(planOptions ?? new PlanOptions { PremiumMonthlyPriceUsd = 10.00m })),
            userLock ?? new UserOperationLock(),
            Options.Create(opts),
            clock,
            NullLogger<PaymentService>.Instance);

        return (sut, provider, db, clock);
    }

    private static string ComputeSignature(string secretKey, string eventType, string subscriptionRef, string orderRef, string customerRef)
    {
        var data = eventType + subscriptionRef + orderRef + customerRef;
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    // ---------- Payment initialization ----------

    [Fact]
    public async Task StartPremiumCheckoutAsync_FreeUser_CreatesTransactionAndReturnsCheckoutForm()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();

        var result = await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);

        Assert.True(result.Success);
        Assert.Equal("test-token", result.Token);
        Assert.Equal(1, provider.InitializeCallCount);

        var transaction = Assert.Single(db.PaymentTransactions);
        Assert.Equal(userId, transaction.UserId);
        Assert.Equal("test-token", transaction.CheckoutToken);
        Assert.Equal(PaymentTransactionStatus.Initiated, transaction.Status);
        Assert.Equal(10.00m, transaction.AmountUsd);
        Assert.Equal("USD", transaction.Currency);
    }

    [Theory]
    [InlineData(0.00)]
    [InlineData(1.00)]
    [InlineData(999.00)]
    public async Task StartPremiumCheckoutAsync_TheStoredAmountAlwaysComesFromThePlanCatalog_NeverFromAnythingElse(decimal attemptedPrice)
    {
        // There is no code path for a caller to submit a price at all (CheckoutBuyerInfo/
        // CheckoutRequestDto carry no such field) — this proves the amount actually recorded is
        // always exactly what PlanCatalog resolves, regardless of what number an attacker might
        // wish it were (0, 1, or any other value never influences the stored transaction).
        var (sut, _, db, _) = CreateSut(planOptions: new PlanOptions { PremiumMonthlyPriceUsd = 10.00m });
        var userId = Guid.NewGuid();

        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);

        var transaction = Assert.Single(db.PaymentTransactions);
        Assert.Equal(10.00m, transaction.AmountUsd);
        Assert.NotEqual(attemptedPrice, transaction.AmountUsd);
    }

    [Fact]
    public async Task StartPremiumCheckoutAsync_AlreadyPremiumUser_DoesNotCallProviderAndReturnsFailure()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "existing-sub-ref"));
        await db.SaveChangesAsync();

        var result = await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);

        Assert.False(result.Success);
        Assert.Equal(0, provider.InitializeCallCount);
        Assert.Empty(db.PaymentTransactions);
    }

    [Fact]
    public async Task StartPremiumCheckoutAsync_ProviderNotConfigured_ReturnsFailureWithoutCreatingTransaction()
    {
        var options = CreateOptions();
        options.ApiKey = ""; // makes IsConfigured false
        var (sut, provider, db, _) = CreateSut(options);
        var userId = Guid.NewGuid();

        var result = await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);

        Assert.False(result.Success);
        Assert.Equal(0, provider.InitializeCallCount);
        Assert.Empty(db.PaymentTransactions);
    }

    [Fact]
    public async Task StartPremiumCheckoutAsync_ProviderInitializationFails_MarksTransactionFailed()
    {
        var (sut, provider, db, _) = CreateSut();
        provider.InitializeResult = new CheckoutInitializationResult(false, null, null, "kart reddedildi");
        var userId = Guid.NewGuid();

        var result = await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);

        Assert.False(result.Success);
        var transaction = Assert.Single(db.PaymentTransactions);
        Assert.Equal(PaymentTransactionStatus.Failed, transaction.Status);
        Assert.Empty(db.Subscriptions);
    }

    // ---------- Successful / failed payment, verification ----------

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_SuccessfulPayment_ActivatesPremiumSubscription()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var token = db.PaymentTransactions.Single().CheckoutToken!;

        var outcome = await sut.ProcessCheckoutCallbackAsync(token);

        Assert.True(outcome.Success);
        var subscription = Assert.Single(db.Subscriptions);
        Assert.Equal(userId, subscription.UserId);
        Assert.Equal(PlanType.Premium, subscription.Plan);
        Assert.Equal(SubscriptionStatus.Active, subscription.Status);
        Assert.Equal("Iyzico", subscription.Provider);
        Assert.Equal("test-subscription-ref", subscription.ProviderSubscriptionId);
        Assert.Equal("test-customer-ref", subscription.ProviderCustomerId);
        Assert.Equal(1, provider.RetrieveCallCount); // authoritative confirmation was actually performed
    }

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_UnknownToken_ReturnsFailureWithoutTouchingSubscriptions()
    {
        var (sut, _, db, _) = CreateSut();

        var outcome = await sut.ProcessCheckoutCallbackAsync("never-issued-token");

        Assert.False(outcome.Success);
        Assert.Empty(db.Subscriptions);
    }

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_ProviderReportsCheckoutFailure_SubscriptionNotCreated()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var token = db.PaymentTransactions.Single().CheckoutToken!;
        provider.CheckoutFormResult = new SubscriptionCheckoutResult(false, null, null, null, "ödeme reddedildi");

        var outcome = await sut.ProcessCheckoutCallbackAsync(token);

        Assert.False(outcome.Success);
        Assert.Empty(db.Subscriptions);
        Assert.Equal(PaymentTransactionStatus.Failed, db.PaymentTransactions.Single().Status);
    }

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_AuthoritativeRetrieveDoesNotFindSubscription_PremiumNotGranted()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var token = db.PaymentTransactions.Single().CheckoutToken!;
        // The checkout-form-result step claims success, but the AUTHORITATIVE server-to-server
        // check disagrees — this must be the deciding factor, not the claim above.
        provider.RetrieveResult = new ProviderSubscriptionState(false, null, "bulunamadı");

        var outcome = await sut.ProcessCheckoutCallbackAsync(token);

        Assert.False(outcome.Success);
        Assert.Empty(db.Subscriptions);
    }

    [Theory]
    [InlineData("PENDING")]
    [InlineData("UNPAID")]
    [InlineData("CANCELED")]
    public async Task ProcessCheckoutCallbackAsync_AuthoritativeStatusNotActive_PremiumNotGranted(string providerStatus)
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var token = db.PaymentTransactions.Single().CheckoutToken!;
        provider.RetrieveResult = new ProviderSubscriptionState(true, providerStatus, null);

        var outcome = await sut.ProcessCheckoutCallbackAsync(token);

        Assert.False(outcome.Success);
        Assert.Empty(db.Subscriptions);
    }

    // ---------- Idempotency / duplicate events ----------

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_CalledThreeTimesForSameToken_OnlyFirstCallActivatesSubscription()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var token = db.PaymentTransactions.Single().CheckoutToken!;

        var first = await sut.ProcessCheckoutCallbackAsync(token);
        var second = await sut.ProcessCheckoutCallbackAsync(token);
        var third = await sut.ProcessCheckoutCallbackAsync(token);

        Assert.True(first.Success);
        Assert.True(second.Success); // idempotent "already processed" — not a failure
        Assert.True(third.Success);
        Assert.Single(db.Subscriptions); // never a second Subscription row
        Assert.Equal(1, provider.RetrieveCallCount); // second/third call never re-verified — short-circuited by the already-Succeeded transaction
    }

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_TwoSimultaneousCallbacksForSameToken_OnlyOneSubscriptionCreated()
    {
        // Unlike the sequential "called three times" test above, this proves the concurrent case:
        // two genuinely simultaneous callbacks/webhook deliveries for the same checkout token (a
        // realistic double-delivery from a payment provider, or a replayed request) racing each
        // other through IUserOperationLock's critical section. Two separate DbContext instances
        // sharing one in-memory database name + one shared lock instance mirrors real ASP.NET Core
        // request handling, where each request gets its own scoped DbContext — see
        // AnalysisQuotaServiceTests' RecordAnalysisUsageAsync_ConcurrentCallsWithOneCreditRemaining_OnlyOneSucceeds
        // for the same pattern applied to quota.
        var dbName = Guid.NewGuid().ToString();
        var userId = Guid.NewGuid();
        var sharedLock = new UserOperationLock();

        var (seedSut, _, seedDb, _) = CreateSut(dbName: dbName, userLock: sharedLock);
        await seedSut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var token = seedDb.PaymentTransactions.Single().CheckoutToken!;

        var (sut1, provider1, _, _) = CreateSut(dbName: dbName, userLock: sharedLock);
        var (sut2, provider2, _, _) = CreateSut(dbName: dbName, userLock: sharedLock);

        var results = await Task.WhenAll(
            sut1.ProcessCheckoutCallbackAsync(token),
            sut2.ProcessCheckoutCallbackAsync(token));

        // Both racers pass provider verification independently (the pre-lock short-circuit only
        // helps a call that arrives *after* the first has already fully committed — true
        // simultaneity means both read the still-Initiated transaction and both call the provider);
        // what must hold is the outcome inside the lock, not the provider call count.
        Assert.All(results, outcome => Assert.True(outcome.Success)); // both report success — the loser finds its own subscription already created, never a failure
        Assert.True(provider1.RetrieveCallCount + provider2.RetrieveCallCount >= 1);

        using var verifyDb = CreateDbContext(dbName);
        Assert.Single(verifyDb.Subscriptions); // never two Subscription rows for the same token/user
        Assert.Single(verifyDb.PaymentTransactions.Where(t => t.Status == PaymentTransactionStatus.Succeeded));
    }

    [Fact]
    public async Task ProcessCheckoutCallbackAsync_AlwaysActivatesTheOriginalCheckoutInitiator()
    {
        // There is no "target user" parameter anywhere in this flow — the token is the only
        // input, and it is permanently bound (at StartPremiumCheckoutAsync time) to whichever
        // user actually authenticated and started the checkout. This is what makes a
        // cross-user/IDOR attempt structurally impossible here, not a runtime permission check.
        var (sut, _, db, _) = CreateSut();
        var originalUserId = Guid.NewGuid();
        await sut.StartPremiumCheckoutAsync(originalUserId, "ada@example.com", Buyer);
        var token = db.PaymentTransactions.Single().CheckoutToken!;

        await sut.ProcessCheckoutCallbackAsync(token);

        var subscription = Assert.Single(db.Subscriptions);
        Assert.Equal(originalUserId, subscription.UserId);
    }

    // ---------- Webhook: signature verification ----------

    [Fact]
    public async Task ProcessWebhookAsync_InvalidSignature_RejectedAndNothingChanges()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-ref-1"));
        await db.SaveChangesAsync();
        var payload = new IyzicoWebhookPayload("subscription.order.success", "sub-ref-1", "order-1", "cust-1");

        var result = await sut.ProcessWebhookAsync(payload, "0000invalidsignature0000");

        Assert.Equal(WebhookProcessingResult.Rejected, result);
        Assert.Equal(0, provider.RetrieveCallCount); // rejected before ever consulting the provider
        Assert.Equal(SubscriptionStatus.Active, db.Subscriptions.Single().Status);
    }

    [Fact]
    public async Task ProcessWebhookAsync_MissingSignatureHeader_Rejected()
    {
        var (sut, _, _, _) = CreateSut();
        var payload = new IyzicoWebhookPayload("subscription.order.success", "sub-ref-1", "order-1", "cust-1");

        var result = await sut.ProcessWebhookAsync(payload, signatureHeader: null);

        Assert.Equal(WebhookProcessingResult.Rejected, result);
    }

    [Fact]
    public async Task ProcessWebhookAsync_ValidSignatureButUnknownSubscription_SafelyIgnored()
    {
        var (sut, _, db, _) = CreateSut();
        var payload = new IyzicoWebhookPayload("subscription.order.success", "never-seen-sub-ref", "order-1", "cust-1");
        var signature = ComputeSignature(TestSecretKey, "subscription.order.success", "never-seen-sub-ref", "order-1", "cust-1");

        var result = await sut.ProcessWebhookAsync(payload, signature);

        Assert.Equal(WebhookProcessingResult.Ignored, result); // acknowledged so Iyzico doesn't endlessly retry — but nothing to act on
        Assert.Empty(db.Subscriptions);
    }

    // ---------- Webhook: lifecycle (cancellation/expiration) + duplicate handling ----------

    [Fact]
    public async Task ProcessWebhookAsync_CancelledStatus_MovesSubscriptionToCancelledAndEffectivePlanBecomesFree()
    {
        var (sut, provider, db, clock) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-ref-1"));
        await db.SaveChangesAsync();
        provider.RetrieveResult = new ProviderSubscriptionState(true, "CANCELED", null);
        var payload = new IyzicoWebhookPayload("subscription.canceled", "sub-ref-1", null, "cust-1");
        var signature = ComputeSignature(TestSecretKey, "subscription.canceled", "sub-ref-1", "", "cust-1");

        var result = await sut.ProcessWebhookAsync(payload, signature);

        Assert.Equal(WebhookProcessingResult.Processed, result);
        var subscription = db.Subscriptions.Single();
        Assert.Equal(SubscriptionStatus.Cancelled, subscription.Status);
        Assert.NotNull(subscription.EndDate);

        var effectivePlan = await new SubscriptionService(db, clock).GetEffectivePlanAsync(userId);
        Assert.Equal(PlanType.Free, effectivePlan);
    }

    [Fact]
    public async Task ProcessWebhookAsync_ExpiredStatus_MovesSubscriptionToExpiredAndEffectivePlanBecomesFree()
    {
        var (sut, provider, db, clock) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-ref-1"));
        await db.SaveChangesAsync();
        provider.RetrieveResult = new ProviderSubscriptionState(true, "EXPIRED", null);
        var payload = new IyzicoWebhookPayload("subscription.expired", "sub-ref-1", null, "cust-1");
        var signature = ComputeSignature(TestSecretKey, "subscription.expired", "sub-ref-1", "", "cust-1");

        await sut.ProcessWebhookAsync(payload, signature);

        Assert.Equal(SubscriptionStatus.Expired, db.Subscriptions.Single().Status);
        var effectivePlan = await new SubscriptionService(db, clock).GetEffectivePlanAsync(userId);
        Assert.Equal(PlanType.Free, effectivePlan);
    }

    [Fact]
    public async Task ProcessWebhookAsync_DuplicateCancellationEventSentThreeTimes_OnlyFirstActuallyUpdates()
    {
        var (sut, provider, db, clock) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-ref-1"));
        await db.SaveChangesAsync();
        provider.RetrieveResult = new ProviderSubscriptionState(true, "CANCELED", null);
        var payload = new IyzicoWebhookPayload("subscription.canceled", "sub-ref-1", null, "cust-1");
        var signature = ComputeSignature(TestSecretKey, "subscription.canceled", "sub-ref-1", "", "cust-1");

        var first = await sut.ProcessWebhookAsync(payload, signature);
        var firstEndDate = db.Subscriptions.Single().EndDate;

        clock.Set(Now.AddHours(1)); // time moves on — if the 2nd/3rd calls updated again, EndDate would move too
        var second = await sut.ProcessWebhookAsync(payload, signature);
        var third = await sut.ProcessWebhookAsync(payload, signature);

        Assert.Equal(WebhookProcessingResult.Processed, first);
        Assert.Equal(WebhookProcessingResult.Processed, second); // idempotent no-op, still "processed" — not an error
        Assert.Equal(WebhookProcessingResult.Processed, third);
        var subscription = db.Subscriptions.Single();
        Assert.Equal(SubscriptionStatus.Cancelled, subscription.Status);
        Assert.Equal(firstEndDate, subscription.EndDate); // unchanged by the 2nd/3rd (no-op) calls
    }

    [Fact]
    public async Task ProcessWebhookAsync_StaleEventTypeArrivesAfterAuthoritativeStatusAlreadyMovedOn_AppliesTheAuthoritativeStatusNotThePayloadsClaim()
    {
        // A genuinely out-of-order delivery: the payload claims "subscription.canceled" (as if
        // the cancellation just happened), but by the time this webhook is actually processed the
        // authoritative provider-side status has already moved on to ACTIVE (e.g. the user
        // resubscribed, or Iyzico's own retry delivered an old event late). ProcessWebhookAsync
        // never trusts the payload's claimed status for anything beyond "go re-check this
        // subscription" — it always applies whatever the authoritative RetrieveSubscriptionStatusAsync
        // call reports right now, so this must NOT cancel a subscription that is actually active.
        var (sut, provider, db, clock) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-ref-1"));
        await db.SaveChangesAsync();
        provider.RetrieveResult = new ProviderSubscriptionState(true, "ACTIVE", null);
        var staleCancelledPayload = new IyzicoWebhookPayload("subscription.canceled", "sub-ref-1", null, "cust-1");
        var signature = ComputeSignature(TestSecretKey, "subscription.canceled", "sub-ref-1", "", "cust-1");

        var result = await sut.ProcessWebhookAsync(staleCancelledPayload, signature);

        Assert.Equal(WebhookProcessingResult.Processed, result);
        Assert.Equal(SubscriptionStatus.Active, db.Subscriptions.Single().Status);
        var effectivePlan = await new SubscriptionService(db, clock).GetEffectivePlanAsync(userId);
        Assert.Equal(PlanType.Premium, effectivePlan);
    }

    // ---------- Subscription cancellation ----------

    [Fact]
    public async Task CancelPremiumSubscriptionAsync_ActiveSubscription_CancelsWithProviderAndUpdatesLocalStatus()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-cancel-1"));
        await db.SaveChangesAsync();
        provider.RetrieveResult = new ProviderSubscriptionState(true, "CANCELED", null);

        var result = await sut.CancelPremiumSubscriptionAsync(userId);

        Assert.True(result.Success);
        Assert.Equal(1, provider.CancelCallCount);
        var subscription = db.Subscriptions.Single();
        Assert.Equal(SubscriptionStatus.Cancelled, subscription.Status);
        Assert.NotNull(subscription.EndDate);
    }

    [Fact]
    public async Task CancelPremiumSubscriptionAsync_NoActiveSubscription_ReturnsFailureAndNeverCallsProvider()
    {
        var (sut, provider, _, _) = CreateSut();

        var result = await sut.CancelPremiumSubscriptionAsync(Guid.NewGuid());

        Assert.False(result.Success);
        Assert.NotNull(result.ErrorMessage);
        Assert.Equal(0, provider.CancelCallCount);
    }

    [Fact]
    public async Task CancelPremiumSubscriptionAsync_ProviderCancelFails_ReturnsFailureAndLeavesSubscriptionActive()
    {
        var (sut, provider, db, _) = CreateSut();
        var userId = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(userId, "sub-cancel-2"));
        await db.SaveChangesAsync();
        provider.CancelResult = false;

        var result = await sut.CancelPremiumSubscriptionAsync(userId);

        Assert.False(result.Success);
        var subscription = db.Subscriptions.Single();
        Assert.Equal(SubscriptionStatus.Active, subscription.Status); // never trust the cancel call alone / never flipped on failure
    }

    [Fact]
    public async Task CancelPremiumSubscriptionAsync_AnotherUsersSubscription_IsNeverAffected()
    {
        var (sut, provider, db, _) = CreateSut();
        var targetUser = Guid.NewGuid();
        var otherUser = Guid.NewGuid();
        db.Subscriptions.Add(ActivePremiumSubscription(otherUser, "sub-other-1"));
        await db.SaveChangesAsync();

        var result = await sut.CancelPremiumSubscriptionAsync(targetUser);

        Assert.False(result.Success); // targetUser has no subscription of their own
        Assert.Equal(0, provider.CancelCallCount);
        Assert.Equal(SubscriptionStatus.Active, db.Subscriptions.Single().Status); // otherUser's row untouched
    }

    // ---------- Payment history ----------

    [Fact]
    public async Task GetPaymentHistoryAsync_ReturnsOnlyCallingUsersOwnTransactions_NewestFirst()
    {
        var (sut, _, db, clock) = CreateSut();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        db.PaymentTransactions.Add(new PaymentTransaction
        {
            Id = Guid.NewGuid(), UserId = userId, ConversationId = "conv-1",
            Status = PaymentTransactionStatus.Succeeded, CreatedAt = Now.UtcDateTime,
        });
        db.PaymentTransactions.Add(new PaymentTransaction
        {
            Id = Guid.NewGuid(), UserId = userId, ConversationId = "conv-2",
            Status = PaymentTransactionStatus.Failed, CreatedAt = Now.AddHours(1).UtcDateTime,
        });
        db.PaymentTransactions.Add(new PaymentTransaction
        {
            Id = Guid.NewGuid(), UserId = otherUserId, ConversationId = "conv-3",
            Status = PaymentTransactionStatus.Succeeded, CreatedAt = Now.AddHours(2).UtcDateTime,
        });
        await db.SaveChangesAsync();

        var history = await sut.GetPaymentHistoryAsync(userId);

        Assert.Equal(2, history.Count);
        Assert.All(history, h => Assert.True(h.Date <= Now.AddHours(1).UtcDateTime));
        Assert.Equal("Failed", history[0].Status); // newest first
        Assert.Equal("Succeeded", history[1].Status);
    }

    [Fact]
    public async Task GetPaymentHistoryAsync_ExposesTheBackendDefinedPriceRecordedAtCheckoutTime_NeverARawProviderAmount()
    {
        // Stage 15 policy: Premium now has a real, backend-owned price, so payment history
        // legitimately shows it — but it must always be the amount PaymentService itself
        // recorded from PlanCatalog at StartPremiumCheckoutAsync time (see the
        // "TheStoredAmountAlwaysComesFromThePlanCatalog" test above for the tamper-resistance
        // half of this guarantee), never anything read back from a provider payload.
        var (sut, _, _, _) = CreateSut(planOptions: new PlanOptions { PremiumMonthlyPriceUsd = 10.00m });
        var userId = Guid.NewGuid();

        await sut.StartPremiumCheckoutAsync(userId, "ada@example.com", Buyer);
        var history = await sut.GetPaymentHistoryAsync(userId);

        var entry = Assert.Single(history);
        Assert.Equal(10.00m, entry.Amount);
        Assert.Equal("USD", entry.Currency);
    }

    private static Subscription ActivePremiumSubscription(Guid userId, string providerSubscriptionId) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        Plan = PlanType.Premium,
        Status = SubscriptionStatus.Active,
        StartDate = Now.UtcDateTime,
        CreatedAt = Now.UtcDateTime,
        UpdatedAt = Now.UtcDateTime,
        Provider = "Iyzico",
        ProviderCustomerId = "cust-1",
        ProviderSubscriptionId = providerSubscriptionId,
    };
}
