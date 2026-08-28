namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// Tracks a user's enrollment in a plan over some time window. A user with NO Subscription row
/// at all is Free by definition (see Services/Billing/SubscriptionService) — Free never requires
/// one of these to exist. A row only gets created when a user actually moves onto a paid plan.
/// The Provider* fields are nullable and unused until Stage 9's Iyzico integration fills them in
/// from real payment-provider responses; they are never populated with fabricated data now.
/// </summary>
public class Subscription
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public PlanType Plan { get; set; }

    public SubscriptionStatus Status { get; set; }

    public DateTime StartDate { get; set; }

    /// <summary>Null while the subscription has no known end (e.g. auto-renewing, or Cancelled-but-not-yet-Expired handling belongs to Status instead).</summary>
    public DateTime? EndDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    /// <summary>Payment provider name (e.g. "Iyzico") once Stage 9 sets this — null until then.</summary>
    public string? Provider { get; set; }

    /// <summary>Provider-side customer identifier — null until Stage 9.</summary>
    public string? ProviderCustomerId { get; set; }

    /// <summary>Provider-side subscription identifier — null until Stage 9.</summary>
    public string? ProviderSubscriptionId { get; set; }

    public User User { get; set; } = null!;
}
