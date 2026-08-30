using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Billing.Payments;

public sealed record CheckoutStartResult(bool Success, string? Token, string? CheckoutFormContent, string? ErrorMessage);

public sealed record CheckoutCallbackOutcome(bool Success);

public sealed record CancelSubscriptionResult(bool Success, string? ErrorMessage);

/// <summary>
/// One row of the caller's own payment history. Amount/Currency (added Stage 15) are the
/// backend's own catalog price at the time this transaction was started — never a raw Iyzico
/// payload, and never anything the client could have influenced (see PaymentService.StartPremiumCheckoutAsync).
/// </summary>
public sealed record PaymentTransactionSummary(DateTime Date, string Status, string? Provider, string? SubscriptionReference, decimal? Amount, string? Currency);

/// <summary>
/// Distinguishes "this call was not authentically from Iyzico" (Rejected — must surface as 401,
/// never a silent 200 an attacker could use to probe signature guesses) from "it was authentic
/// but there was nothing actionable in it" (Ignored — an unknown/duplicate event, still a normal
/// 200 so Iyzico doesn't endlessly retry) and "it was authentic and caused/confirmed a state
/// change" (Processed).
/// </summary>
public enum WebhookProcessingResult
{
    Rejected,
    Ignored,
    Processed,
}

/// <summary>
/// Orchestrates the checkout flow on top of <see cref="IPaymentProvider"/>: creates the
/// idempotency anchor (PaymentTransaction) before ever calling the provider, and is the only
/// place that writes to the existing Subscription table as a result of a payment event —
/// BillingController never touches Subscription directly.
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Starts a Premium subscription checkout for <paramref name="userId"/>. Returns a failure
    /// result (never throws) if the user is already Premium, or if Iyzico isn't configured.
    /// </summary>
    Task<CheckoutStartResult> StartPremiumCheckoutAsync(
        Guid userId, string customerEmail, CheckoutBuyerInfo buyer, CancellationToken cancellationToken = default);

    /// <summary>
    /// Handles the browser's redirect-back-with-token from Iyzico's checkout form. Resolves the
    /// owning user via the stored PaymentTransaction (never a client-supplied id), performs the
    /// CF-Retrieve step, and — only after RetrieveSubscriptionStatusAsync authoritatively confirms
    /// success — activates Premium. Idempotent: calling this twice with the same token is safe.
    /// </summary>
    Task<CheckoutCallbackOutcome> ProcessCheckoutCallbackAsync(string token, CancellationToken cancellationToken = default);

    /// <summary>
    /// Handles an async Iyzico webhook notification. Verifies the signature first (fast reject);
    /// on a pass, resolves the subscription via its own reference code (never a payload-claimed
    /// user id) and re-confirms status server-to-server before mutating anything. Idempotent.
    /// </summary>
    Task<WebhookProcessingResult> ProcessWebhookAsync(IyzicoWebhookPayload payload, string? signatureHeader, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels <paramref name="userId"/>'s active Premium subscription via the provider, then
    /// re-confirms the resulting status server-to-server before updating the local Subscription
    /// row — the same "never trust a single call's own success flag" pattern used everywhere else
    /// in this file. Never throws; returns a failure result if the user has no active Premium
    /// subscription or the provider call itself fails.
    /// </summary>
    Task<CancelSubscriptionResult> CancelPremiumSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>The caller's own payment attempts (checkout starts), newest first. Always scoped to <paramref name="userId"/> — never any other user's rows.</summary>
    Task<IReadOnlyList<PaymentTransactionSummary>> GetPaymentHistoryAsync(Guid userId, CancellationToken cancellationToken = default);
}
