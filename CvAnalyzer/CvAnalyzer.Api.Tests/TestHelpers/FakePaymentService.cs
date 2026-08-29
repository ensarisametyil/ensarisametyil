using CvAnalyzer.Api.Services.Billing.Payments;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Configurable fake for controller-level tests that don't care about payment orchestration logic itself (that's covered by PaymentServiceTests against FakePaymentProvider).</summary>
public class FakePaymentService : IPaymentService
{
    public CheckoutStartResult CheckoutResult { get; set; } = new(true, "fake-token", "<script>fake</script>", null);

    public CheckoutCallbackOutcome CallbackOutcome { get; set; } = new(true);

    public WebhookProcessingResult WebhookResult { get; set; } = WebhookProcessingResult.Processed;

    public Task<CheckoutStartResult> StartPremiumCheckoutAsync(Guid userId, string customerEmail, CheckoutBuyerInfo buyer, CancellationToken cancellationToken = default) =>
        Task.FromResult(CheckoutResult);

    public Task<CheckoutCallbackOutcome> ProcessCheckoutCallbackAsync(string token, CancellationToken cancellationToken = default) =>
        Task.FromResult(CallbackOutcome);

    public Task<WebhookProcessingResult> ProcessWebhookAsync(IyzicoWebhookPayload payload, string? signatureHeader, CancellationToken cancellationToken = default) =>
        Task.FromResult(WebhookResult);
}
