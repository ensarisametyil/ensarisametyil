using CvAnalyzer.Api.Services.Billing.Payments;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>
/// Stands in for IyzicoPaymentProvider in every test — nothing in this test suite ever calls the
/// real Iyzico API. Each method's result is independently configurable and every call is counted,
/// so tests can assert both "what was returned" and "was the provider even called" (e.g. quota
/// already exhausted must never reach the AI provider; a subscription that's already Premium
/// must never reach this payment provider either).
/// </summary>
public class FakePaymentProvider : IPaymentProvider
{
    public CheckoutInitializationResult InitializeResult { get; set; } = new(true, "test-token", "<script>fake-checkout-form</script>", null);

    public SubscriptionCheckoutResult CheckoutFormResult { get; set; } = new(true, "test-subscription-ref", "test-customer-ref", "ACTIVE", null);

    public ProviderSubscriptionState RetrieveResult { get; set; } = new(true, "ACTIVE", null);

    public bool CancelResult { get; set; } = true;

    public int InitializeCallCount { get; private set; }

    public int GetCheckoutFormResultCallCount { get; private set; }

    public int RetrieveCallCount { get; private set; }

    public int CancelCallCount { get; private set; }

    public Task<CheckoutInitializationResult> InitializeSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken cancellationToken = default)
    {
        InitializeCallCount++;
        return Task.FromResult(InitializeResult);
    }

    public Task<SubscriptionCheckoutResult> GetCheckoutFormResultAsync(string token, CancellationToken cancellationToken = default)
    {
        GetCheckoutFormResultCallCount++;
        return Task.FromResult(CheckoutFormResult);
    }

    public Task<ProviderSubscriptionState> RetrieveSubscriptionStatusAsync(string subscriptionReferenceCode, CancellationToken cancellationToken = default)
    {
        RetrieveCallCount++;
        return Task.FromResult(RetrieveResult);
    }

    public Task<bool> CancelSubscriptionAsync(string subscriptionReferenceCode, CancellationToken cancellationToken = default)
    {
        CancelCallCount++;
        return Task.FromResult(CancelResult);
    }
}
