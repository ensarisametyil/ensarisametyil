using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>
/// Shape of Iyzico's subscription webhook notification body, as documented at
/// docs.iyzico.com/en/advanced/webhook and docs.iyzico.com/en/products/subscription (field names
/// reconstructed from indexed documentation content — docs.iyzico.com itself was unreachable
/// from this sandbox's network egress; see IyzicoWebhookSignatureVerifier's doc comment for the
/// same caveat on the signature formula). Untrusted external input in every field — used only to
/// know WHICH subscription to re-check server-to-server, never as a trusted status by itself.
/// </summary>
public record IyzicoWebhookRequestDto(
    [property: JsonPropertyName("iyziEventType")] string? IyziEventType,
    [property: JsonPropertyName("subscriptionReferenceCode")] string? SubscriptionReferenceCode,
    [property: JsonPropertyName("orderReferenceCode")] string? OrderReferenceCode,
    [property: JsonPropertyName("customerReferenceCode")] string? CustomerReferenceCode);
