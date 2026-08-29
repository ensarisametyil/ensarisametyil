namespace CvAnalyzer.Api.Services.Billing.Payments;

/// <summary>Payload fields used both to build the signature and to identify which subscription a webhook is about.</summary>
public sealed record IyzicoWebhookPayload(
    string? EventType,
    string? SubscriptionReferenceCode,
    string? OrderReferenceCode,
    string? CustomerReferenceCode);

public interface IIyzicoWebhookSignatureVerifier
{
    bool Verify(IyzicoWebhookPayload payload, string? signatureHeader);
}
