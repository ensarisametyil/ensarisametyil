using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Billing.Payments;

public sealed record CheckoutStartResult(bool Success, string? Token, string? CheckoutFormContent, string? ErrorMessage);

public sealed record CheckoutCallbackOutcome(bool Success);

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
}
