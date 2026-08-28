namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// Lifecycle of a Subscription row. Only the statuses actually meaningful to this stage's logic
/// are here — see docs/monetization.md for how each is expected to be used once Stage 9 wires up
/// real Iyzico payment events (e.g. PastDue for a failed renewal charge).
/// </summary>
public enum SubscriptionStatus
{
    /// <summary>Currently grants its Plan's entitlements (subject to StartDate/EndDate coverage).</summary>
    Active,

    /// <summary>Payment failed/renewal is overdue — not yet cancelled, but not to be trusted as Active.</summary>
    PastDue,

    /// <summary>User (or an admin) ended it; does not grant entitlements even if EndDate hasn't passed.</summary>
    Cancelled,

    /// <summary>Its coverage window has ended.</summary>
    Expired,

    /// <summary>Created but not yet confirmed (e.g. awaiting a payment provider callback in Stage 9).</summary>
    Pending,
}
