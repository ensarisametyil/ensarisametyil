using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.Billing.Payments;

/// <summary>
/// Verifies the `X-IYZ-SIGNATURE-V3` header Iyzico sends on subscription webhook notifications.
///
/// IMPORTANT — documented honestly rather than presented as more certain than it is (see
/// docs/iyzico-integration.md, "Webhook Signature Verification — a documented uncertainty"):
/// docs.iyzico.com could not be fetched directly from this sandbox (network egress to that host
/// is blocked here), so this formula is reconstructed from Iyzico's own search-indexed
/// documentation snippets, which show the *general* payment-webhook signature and the
/// *subscription*-webhook signature built from different field sets. This class implements the
/// subscription-specific formula (the one that matches this app's actual product):
///
///     HMACSHA256_hex(secretKey, eventType + subscriptionReferenceCode + orderReferenceCode + customerReferenceCode)
///
/// compared against X-IYZ-SIGNATURE-V3 using a constant-time comparison. Because this exact field
/// composition is not 100% independently confirmed, this check is treated as a fast-reject filter
/// ONLY — it is never, by itself, sufficient to mutate a Subscription. Every webhook that passes
/// this check is still followed by an authoritative, server-to-server
/// IPaymentProvider.RetrieveSubscriptionStatusAsync call before any state changes (see
/// PaymentService); a signature bug here can cause false rejections, never false acceptances of
/// unconfirmed state.
/// </summary>
public class IyzicoWebhookSignatureVerifier : IIyzicoWebhookSignatureVerifier
{
    private readonly IyzicoOptions _options;

    public IyzicoWebhookSignatureVerifier(IOptions<IyzicoOptions> options)
    {
        _options = options.Value;
    }

    public bool Verify(IyzicoWebhookPayload payload, string? signatureHeader)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader) || string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            return false;
        }

        var expected = ComputeSignature(_options.SecretKey, payload);

        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(signatureHeader.Trim());

        // Constant-time comparison — a webhook signature check is exactly the kind of comparison
        // that must not leak timing information about how many leading characters matched.
        return expectedBytes.Length == actualBytes.Length && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private static string ComputeSignature(string secretKey, IyzicoWebhookPayload payload)
    {
        var data = (payload.EventType ?? string.Empty)
                   + (payload.SubscriptionReferenceCode ?? string.Empty)
                   + (payload.OrderReferenceCode ?? string.Empty)
                   + (payload.CustomerReferenceCode ?? string.Empty);

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
