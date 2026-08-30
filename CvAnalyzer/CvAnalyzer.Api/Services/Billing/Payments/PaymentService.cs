using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.Billing.Payments;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _db;
    private readonly IPaymentProvider _provider;
    private readonly IIyzicoWebhookSignatureVerifier _signatureVerifier;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IPlanCatalog _planCatalog;
    private readonly IUserOperationLock _userLock;
    private readonly IyzicoOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(
        AppDbContext db,
        IPaymentProvider provider,
        IIyzicoWebhookSignatureVerifier signatureVerifier,
        ISubscriptionService subscriptionService,
        IPlanCatalog planCatalog,
        IUserOperationLock userLock,
        IOptions<IyzicoOptions> options,
        TimeProvider timeProvider,
        ILogger<PaymentService> logger)
    {
        _db = db;
        _provider = provider;
        _signatureVerifier = signatureVerifier;
        _subscriptionService = subscriptionService;
        _planCatalog = planCatalog;
        _userLock = userLock;
        _options = options.Value;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<CheckoutStartResult> StartPremiumCheckoutAsync(
        Guid userId, string customerEmail, CheckoutBuyerInfo buyer, CancellationToken cancellationToken = default)
    {
        var currentPlan = await _subscriptionService.GetEffectivePlanAsync(userId, cancellationToken);
        if (currentPlan == PlanType.Premium)
        {
            return new CheckoutStartResult(false, null, null, "Zaten Premium plandasınız.");
        }

        if (!_options.IsConfigured)
        {
            _logger.LogWarning("Checkout requested but Iyzico is not configured.");
            return new CheckoutStartResult(false, null, null, "Ödeme servisi şu anda kullanılamıyor.");
        }

        // The price is resolved from the server-side plan catalog, and only from there — the
        // caller's request (CheckoutRequestDto) carries no price/amount/currency field for this
        // to ever be influenced by. Stamped onto the transaction now so it stays a stable
        // historical fact even if the catalog's price changes later.
        var premiumPrice = _planCatalog.GetPlan(PlanType.Premium).MonthlyPriceUsd;

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ConversationId = Guid.NewGuid().ToString("N"),
            Status = PaymentTransactionStatus.Initiated,
            AmountUsd = premiumPrice,
            Currency = premiumPrice is null ? null : "USD",
            CreatedAt = now,
        };
        _db.PaymentTransactions.Add(transaction);
        await _db.SaveChangesAsync(cancellationToken);

        var request = new SubscriptionCheckoutRequest(transaction.ConversationId, _options.CallbackUrl, customerEmail, buyer);
        var result = await _provider.InitializeSubscriptionCheckoutAsync(request, cancellationToken);

        if (!result.Success)
        {
            transaction.Status = PaymentTransactionStatus.Failed;
            transaction.FailureReason = result.ErrorMessage ?? "Ödeme başlatılamadı.";
            transaction.ProcessedAt = _timeProvider.GetUtcNow().UtcDateTime;
            await _db.SaveChangesAsync(cancellationToken);
            return new CheckoutStartResult(false, null, null, "Ödeme başlatılamadı. Lütfen daha sonra tekrar deneyin.");
        }

        transaction.CheckoutToken = result.Token;
        await _db.SaveChangesAsync(cancellationToken);

        return new CheckoutStartResult(true, result.Token, result.CheckoutFormContent, null);
    }

    public async Task<CheckoutCallbackOutcome> ProcessCheckoutCallbackAsync(string token, CancellationToken cancellationToken = default)
    {
        var transaction = await _db.PaymentTransactions.SingleOrDefaultAsync(t => t.CheckoutToken == token, cancellationToken);
        if (transaction is null)
        {
            _logger.LogWarning("Checkout callback received for an unknown token.");
            return new CheckoutCallbackOutcome(false);
        }

        // Idempotent: a browser refresh/double-submit of the callback must not reprocess.
        if (transaction.Status is PaymentTransactionStatus.Succeeded or PaymentTransactionStatus.Failed)
        {
            return new CheckoutCallbackOutcome(transaction.Status == PaymentTransactionStatus.Succeeded);
        }

        var cfResult = await _provider.GetCheckoutFormResultAsync(token, cancellationToken);
        if (!cfResult.Success || string.IsNullOrWhiteSpace(cfResult.SubscriptionReferenceCode))
        {
            await MarkFailedAsync(transaction, cfResult.ErrorMessage ?? "Ödeme sonucu doğrulanamadı.", cancellationToken);
            return new CheckoutCallbackOutcome(false);
        }

        // Never trust the checkout-form-result status alone — re-confirm server-to-server.
        var authoritative = await _provider.RetrieveSubscriptionStatusAsync(cfResult.SubscriptionReferenceCode, cancellationToken);
        if (!authoritative.Found)
        {
            await MarkFailedAsync(transaction, authoritative.ErrorMessage ?? "Abonelik doğrulanamadı.", cancellationToken);
            return new CheckoutCallbackOutcome(false);
        }

        var mappedStatus = MapProviderStatus(authoritative.ProviderStatus);
        if (mappedStatus != SubscriptionStatus.Active)
        {
            await MarkFailedAsync(transaction, $"Abonelik durumu beklenmiyor: {authoritative.ProviderStatus}", cancellationToken);
            return new CheckoutCallbackOutcome(false);
        }

        using (await _userLock.AcquireAsync(transaction.UserId, cancellationToken))
        {
            var existing = await _db.Subscriptions.SingleOrDefaultAsync(
                s => s.ProviderSubscriptionId == cfResult.SubscriptionReferenceCode, cancellationToken);

            if (existing is null)
            {
                var now = _timeProvider.GetUtcNow().UtcDateTime;
                _db.Subscriptions.Add(new Subscription
                {
                    Id = Guid.NewGuid(),
                    UserId = transaction.UserId,
                    Plan = PlanType.Premium,
                    Status = SubscriptionStatus.Active,
                    StartDate = now,
                    EndDate = null,
                    CreatedAt = now,
                    UpdatedAt = now,
                    Provider = "Iyzico",
                    ProviderCustomerId = cfResult.CustomerReferenceCode,
                    ProviderSubscriptionId = cfResult.SubscriptionReferenceCode,
                });
            }

            transaction.Status = PaymentTransactionStatus.Succeeded;
            transaction.ProviderSubscriptionReferenceCode = cfResult.SubscriptionReferenceCode;
            transaction.ProcessedAt = _timeProvider.GetUtcNow().UtcDateTime;

            await _db.SaveChangesAsync(cancellationToken);
        }

        return new CheckoutCallbackOutcome(true);
    }

    public async Task<WebhookProcessingResult> ProcessWebhookAsync(IyzicoWebhookPayload payload, string? signatureHeader, CancellationToken cancellationToken = default)
    {
        if (!_signatureVerifier.Verify(payload, signatureHeader))
        {
            _logger.LogWarning("Iyzico webhook rejected: invalid signature. EventType={EventType}", payload.EventType);
            return WebhookProcessingResult.Rejected;
        }

        if (string.IsNullOrWhiteSpace(payload.SubscriptionReferenceCode))
        {
            _logger.LogWarning("Iyzico webhook authentic but missing subscriptionReferenceCode — nothing to act on.");
            return WebhookProcessingResult.Ignored;
        }

        // Signature-valid does not mean trusted content — always re-confirm server-to-server
        // before this payload is allowed to change anything.
        var authoritative = await _provider.RetrieveSubscriptionStatusAsync(payload.SubscriptionReferenceCode, cancellationToken);
        if (!authoritative.Found)
        {
            _logger.LogWarning(
                "Iyzico webhook: authoritative retrieve found no matching subscription. SubscriptionReferenceCode={SubscriptionReferenceCode}",
                payload.SubscriptionReferenceCode);
            return WebhookProcessingResult.Ignored;
        }

        var mappedStatus = MapProviderStatus(authoritative.ProviderStatus);
        if (mappedStatus is null)
        {
            _logger.LogWarning("Iyzico webhook: unrecognized provider status {ProviderStatus}.", authoritative.ProviderStatus);
            return WebhookProcessingResult.Ignored;
        }

        // A webhook only UPDATES a subscription this app already knows about (created via the
        // checkout callback, which is the only path that has a user id to attach to a brand new
        // Subscription row) — it never creates a new user/subscription mapping from a payload
        // that carries no reliable "our" user id at all.
        var subscription = await _db.Subscriptions.SingleOrDefaultAsync(
            s => s.ProviderSubscriptionId == payload.SubscriptionReferenceCode, cancellationToken);

        if (subscription is null)
        {
            _logger.LogInformation(
                "Iyzico webhook for an unknown subscription (not yet created via checkout callback) — ignored. SubscriptionReferenceCode={SubscriptionReferenceCode}",
                payload.SubscriptionReferenceCode);
            return WebhookProcessingResult.Ignored;
        }

        using (await _userLock.AcquireAsync(subscription.UserId, cancellationToken))
        {
            // Duplicate/replayed event for a status we've already recorded — safe no-op.
            if (subscription.Status == mappedStatus.Value)
            {
                return WebhookProcessingResult.Processed;
            }

            subscription.Status = mappedStatus.Value;
            subscription.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
            if (mappedStatus is SubscriptionStatus.Cancelled or SubscriptionStatus.Expired)
            {
                subscription.EndDate ??= _timeProvider.GetUtcNow().UtcDateTime;
            }

            await _db.SaveChangesAsync(cancellationToken);
        }

        return WebhookProcessingResult.Processed;
    }

    public async Task<CancelSubscriptionResult> CancelPremiumSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        using (await _userLock.AcquireAsync(userId, cancellationToken))
        {
            var subscription = await _db.Subscriptions
                .Where(s => s.UserId == userId && s.Plan == PlanType.Premium && s.Status == SubscriptionStatus.Active)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (subscription is null || string.IsNullOrWhiteSpace(subscription.ProviderSubscriptionId))
            {
                return new CancelSubscriptionResult(false, "Aktif bir Premium aboneliğiniz yok.");
            }

            var cancelled = await _provider.CancelSubscriptionAsync(subscription.ProviderSubscriptionId, cancellationToken);
            if (!cancelled)
            {
                _logger.LogWarning("Iyzico subscription cancellation failed for user {UserId}.", userId);
                return new CancelSubscriptionResult(false, "Abonelik iptal edilemedi. Lütfen daha sonra tekrar deneyin.");
            }

            // Never trust the cancel call's own boolean as the final local state — re-confirm
            // server-to-server, the same pattern the checkout callback and webhook already use.
            var authoritative = await _provider.RetrieveSubscriptionStatusAsync(subscription.ProviderSubscriptionId, cancellationToken);
            var mappedStatus = (authoritative.Found ? MapProviderStatus(authoritative.ProviderStatus) : null) ?? SubscriptionStatus.Cancelled;
            var now = _timeProvider.GetUtcNow().UtcDateTime;

            subscription.Status = mappedStatus;
            subscription.UpdatedAt = now;
            if (mappedStatus is SubscriptionStatus.Cancelled or SubscriptionStatus.Expired)
            {
                subscription.EndDate ??= now;
            }

            await _db.SaveChangesAsync(cancellationToken);
            return new CancelSubscriptionResult(true, null);
        }
    }

    public async Task<IReadOnlyList<PaymentTransactionSummary>> GetPaymentHistoryAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _db.PaymentTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new PaymentTransactionSummary(t.CreatedAt, t.Status.ToString(), t.ProviderSubscriptionReferenceCode != null ? "Iyzico" : null, t.ProviderSubscriptionReferenceCode, t.AmountUsd, t.Currency))
            .ToListAsync(cancellationToken);

    private async Task MarkFailedAsync(PaymentTransaction transaction, string reason, CancellationToken cancellationToken)
    {
        transaction.Status = PaymentTransactionStatus.Failed;
        transaction.FailureReason = reason;
        transaction.ProcessedAt = _timeProvider.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Maps Iyzico's subscription status strings (verified against the installed Iyzipay SDK's
    /// SubscriptionStatus enum: ACTIVE, PENDING, UNPAID, UPGRADED, CANCELED, EXPIRED) onto this
    /// app's own SubscriptionStatus. UPGRADED still grants Premium (the subscription is active,
    /// just moved plans). Unknown values map to null — treated as "don't act" rather than guessed.
    /// </summary>
    private static SubscriptionStatus? MapProviderStatus(string? providerStatus) => providerStatus?.Trim().ToUpperInvariant() switch
    {
        "ACTIVE" => SubscriptionStatus.Active,
        "UPGRADED" => SubscriptionStatus.Active,
        "PENDING" => SubscriptionStatus.Pending,
        "UNPAID" => SubscriptionStatus.PastDue,
        "CANCELED" => SubscriptionStatus.Cancelled,
        "EXPIRED" => SubscriptionStatus.Expired,
        _ => null,
    };
}
