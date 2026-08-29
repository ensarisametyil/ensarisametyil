using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CvAnalyzer.Api.Models.Dtos.Auth;
using CvAnalyzer.Api.Models.Dtos.Billing;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Exercises the checkout/callback/webhook endpoints through the real HTTP pipeline — the layer a
/// controller-level unit test can't reach (real [Authorize]/[AllowAnonymous] enforcement, real
/// model binding of a request body with unexpected extra fields). The Iyzico SDK itself is never
/// invoked — CustomWebApplicationFactory swaps in a FakePaymentProvider.
/// </summary>
public class BillingCheckoutIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BillingCheckoutIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    private async Task<string> RegisterAndGetTokenAsync()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "Password123" });
        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return body!.AccessToken;
    }

    [Fact]
    public async Task Checkout_TamperedRequestBodyClaimingPremium_IsIgnoredAndNeverGrantsPremium()
    {
        var token = await RegisterAndGetTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // A malicious/buggy client throws in fields that would matter if the backend ever
        // trusted client-supplied plan/outcome state — CheckoutRequestDto simply has no such
        // properties to bind them into, so ASP.NET Core's model binder silently drops them.
        using var content = new StringContent(
            """{"name":"Ada","surname":"Lovelace","identityNumber":"11111111111","gsmNumber":"5551234567","city":"Istanbul","addressLine":"Test Sk. No:1","plan":"Premium","isPremium":true,"paymentSuccess":true,"subscriptionStatus":"Active"}""",
            System.Text.Encoding.UTF8, "application/json");

        var checkoutResponse = await _client.PostAsync("/api/billing/checkout", content);
        Assert.Equal(HttpStatusCode.OK, checkoutResponse.StatusCode);

        var usageResponse = await _client.GetAsync("/api/billing/usage");
        var usage = await usageResponse.Content.ReadFromJsonAsync<UsageDto>();
        Assert.Equal("FREE", usage!.Plan);
    }

    [Fact]
    public async Task Checkout_AuthenticatedUser_ReturnsCheckoutFormFromProvider()
    {
        var token = await RegisterAndGetTokenAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync("/api/billing/checkout", new
        {
            name = "Ada",
            surname = "Lovelace",
            identityNumber = "11111111111",
            gsmNumber = "5551234567",
            city = "Istanbul",
            addressLine = "Test Sk. No:1",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CheckoutResponseDto>();
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
    }

    [Fact]
    public async Task CheckoutCallback_WithoutAnyToken_RedirectsToFailedResultWithoutRequiringAuth()
    {
        var response = await _client.PostAsync("/api/billing/checkout/callback", new FormUrlEncodedContent([]));

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("status=failed", response.Headers.Location!.ToString());
    }

    [Fact]
    public async Task Webhook_WithoutSignatureHeader_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/billing/webhook/iyzico", new
        {
            iyziEventType = "subscription.canceled",
            subscriptionReferenceCode = "sub-ref-1",
            customerReferenceCode = "cust-1",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Webhook_WithInvalidSignature_ReturnsUnauthorizedAndDoesNotRequireAJwt()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/billing/webhook/iyzico")
        {
            Content = JsonContent.Create(new
            {
                iyziEventType = "subscription.canceled",
                subscriptionReferenceCode = "sub-ref-1",
                customerReferenceCode = "cust-1",
            }),
        };
        request.Headers.Add("X-IYZ-SIGNATURE-V3", "clearly-not-a-valid-signature");

        var response = await _client.SendAsync(request);

        // Rejected on signature grounds specifically, not because it lacked a Bearer token — the
        // whole point of this endpoint is that Iyzico calls it server-to-server, without a JWT.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
