using System.Security.Cryptography;
using System.Text;
using CvAnalyzer.Api.Services.Billing.Payments;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Billing.Payments;

public class IyzicoWebhookSignatureVerifierTests
{
    private const string SecretKey = "test-only-secret-key-never-used-for-anything-real-0123456789";

    private static IyzicoWebhookSignatureVerifier CreateSut(string? secretKey = null) =>
        new(Options.Create(new IyzicoOptions { SecretKey = secretKey ?? SecretKey }));

    private static string ComputeValidSignature(string secretKey, IyzicoWebhookPayload payload)
    {
        var data = (payload.EventType ?? "") + (payload.SubscriptionReferenceCode ?? "") + (payload.OrderReferenceCode ?? "") + (payload.CustomerReferenceCode ?? "");
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    [Fact]
    public void Verify_CorrectlySignedPayload_ReturnsTrue()
    {
        var sut = CreateSut();
        var payload = new IyzicoWebhookPayload("subscription.order.success", "sub-1", "order-1", "cust-1");
        var signature = ComputeValidSignature(SecretKey, payload);

        Assert.True(sut.Verify(payload, signature));
    }

    [Fact]
    public void Verify_TamperedSubscriptionReferenceCode_ReturnsFalse()
    {
        // Simulates callback/webhook spoofing: an attacker who knows a valid signature for one
        // subscription cannot reuse it by swapping in a different subscriptionReferenceCode.
        var sut = CreateSut();
        var originalPayload = new IyzicoWebhookPayload("subscription.order.success", "sub-1", "order-1", "cust-1");
        var validSignatureForOriginal = ComputeValidSignature(SecretKey, originalPayload);
        var tamperedPayload = originalPayload with { SubscriptionReferenceCode = "sub-2-victim" };

        Assert.False(sut.Verify(tamperedPayload, validSignatureForOriginal));
    }

    [Fact]
    public void Verify_WrongSecretKey_ReturnsFalse()
    {
        var sut = CreateSut(secretKey: "the-real-secret");
        var payload = new IyzicoWebhookPayload("subscription.order.success", "sub-1", "order-1", "cust-1");
        var signatureFromWrongSecret = ComputeValidSignature("attacker-guessed-secret", payload);

        Assert.False(sut.Verify(payload, signatureFromWrongSecret));
    }

    [Fact]
    public void Verify_MissingSignatureHeader_ReturnsFalse()
    {
        var sut = CreateSut();
        var payload = new IyzicoWebhookPayload("subscription.order.success", "sub-1", "order-1", "cust-1");

        Assert.False(sut.Verify(payload, null));
        Assert.False(sut.Verify(payload, ""));
        Assert.False(sut.Verify(payload, "   "));
    }

    [Fact]
    public void Verify_GarbageSignature_ReturnsFalse()
    {
        var sut = CreateSut();
        var payload = new IyzicoWebhookPayload("subscription.order.success", "sub-1", "order-1", "cust-1");

        Assert.False(sut.Verify(payload, "not-a-real-signature-at-all"));
    }
}
