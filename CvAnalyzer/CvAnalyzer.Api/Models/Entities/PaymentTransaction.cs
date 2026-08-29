namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// One row per checkout attempt — the idempotency anchor for the whole payment flow. Every
/// inbound callback/webhook is resolved back to the user through THIS row (by ConversationId,
/// CheckoutToken, or ProviderSubscriptionReferenceCode — never through a client-supplied user
/// id), and a webhook/callback that has already been recorded as Succeeded for the same
/// ProviderSubscriptionReferenceCode is a safe no-op rather than being processed again.
/// </summary>
public class PaymentTransaction
{
    public Guid Id { get; set; }

    /// <summary>Owning user — the checkout was started by this authenticated user; every later step resolves back to them via this row, not via anything the callback/webhook itself claims.</summary>
    public Guid UserId { get; set; }

    /// <summary>Our own generated correlation id, sent to Iyzico as conversationId and unique per attempt.</summary>
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>Iyzico's checkout form token — set once InitializeCheckoutForm succeeds; used to resolve the browser's callback redirect.</summary>
    public string? CheckoutToken { get; set; }

    /// <summary>Iyzico's subscriptionReferenceCode — set once the checkout result / webhook resolves it; the idempotency key for "have we already activated this subscription".</summary>
    public string? ProviderSubscriptionReferenceCode { get; set; }

    public PaymentTransactionStatus Status { get; set; }

    /// <summary>Safe, generic reason (never a raw provider payload or secret) — e.g. "kart reddedildi", "imza doğrulanamadı".</summary>
    public string? FailureReason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ProcessedAt { get; set; }

    public User User { get; set; } = null!;
}
