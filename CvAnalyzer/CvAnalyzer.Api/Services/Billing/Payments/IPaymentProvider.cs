namespace CvAnalyzer.Api.Services.Billing.Payments;

/// <summary>
/// Thin abstraction over a payment provider's subscription checkout flow. No controller or
/// orchestration code talks to the Iyzico SDK directly — only <see cref="IyzicoPaymentProvider"/>
/// does. Swapping providers, or substituting a fake for tests, means implementing this interface
/// only.
/// </summary>
public interface IPaymentProvider
{
    /// <summary>Starts a subscription checkout session. Returns the token/form content to hand back to the frontend.</summary>
    Task<CheckoutInitializationResult> InitializeSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken cancellationToken = default);

    /// <summary>Resolves a checkout token (from the browser callback redirect) to its outcome — the CF-Retrieve step.</summary>
    Task<SubscriptionCheckoutResult> GetCheckoutFormResultAsync(string token, CancellationToken cancellationToken = default);

    /// <summary>Authoritative, server-to-server subscription status check — the source of truth this app actually trusts before mutating any Subscription row.</summary>
    Task<ProviderSubscriptionState> RetrieveSubscriptionStatusAsync(string subscriptionReferenceCode, CancellationToken cancellationToken = default);

    Task<bool> CancelSubscriptionAsync(string subscriptionReferenceCode, CancellationToken cancellationToken = default);
}
