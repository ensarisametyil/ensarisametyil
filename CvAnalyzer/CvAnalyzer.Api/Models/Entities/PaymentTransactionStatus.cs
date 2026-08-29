namespace CvAnalyzer.Api.Models.Entities;

/// <summary>Lifecycle of one checkout attempt (see PaymentTransaction). Not the subscription's own status — SubscriptionStatus is separate and unaffected by a Failed checkout.</summary>
public enum PaymentTransactionStatus
{
    /// <summary>Checkout form was created; outcome not yet known.</summary>
    Initiated,

    /// <summary>Verified (signature + authoritative provider retrieve) as a successful subscription activation.</summary>
    Succeeded,

    /// <summary>Verified as failed/cancelled, or verification itself failed (invalid signature, provider said "not found", etc.).</summary>
    Failed,
}
