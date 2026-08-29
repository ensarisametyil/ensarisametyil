using System.Net;
using System.Text;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Proves [RequestSizeLimit] on the small-JSON-body auth/contact/billing endpoints actually
/// rejects an oversized body with 413 — not just that the attribute is present in source. Needs
/// a real Kestrel transport (see <see cref="RealServerWebApplicationFactory"/>) because TestServer
/// does not implement IHttpMaxRequestBodySizeFeature, so the limit would silently no-op under the
/// standard <see cref="CustomWebApplicationFactory"/>.
/// </summary>
public class RequestSizeLimitIntegrationTests : IClassFixture<RealServerWebApplicationFactory>
{
    private readonly HttpClient _client;

    public RequestSizeLimitIntegrationTests(RealServerWebApplicationFactory factory)
    {
        // Touching Server forces WebApplicationFactory's lazy EnsureServer()/CreateHost() to run,
        // which is what populates RealServerBaseAddress (CreateHost isn't invoked until something
        // actually needs the server). Deliberately not factory.CreateClient() itself — that always
        // dispatches through the in-memory TestServer handler regardless of BaseAddress. A plain
        // HttpClient pointed at the real Kestrel listener is what actually exercises
        // IHttpMaxRequestBodySizeFeature.
        _ = factory.Server;
        _client = new HttpClient { BaseAddress = factory.RealServerBaseAddress };
    }

    [Fact]
    public async Task Login_WithOversizedBody_RejectedWithPayloadTooLarge()
    {
        // AuthController's MaxSmallJsonBodyBytes is 8 KiB; well past a real email/password pair.
        var hugePassword = new string('a', 100_000);
        var content = new StringContent(
            $"{{\"email\":\"nobody@example.com\",\"password\":\"{hugePassword}\"}}",
            Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/auth/login", content);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithNormalSizedBody_StillWorksThroughTheRealServer()
    {
        // Sanity check that the real-Kestrel factory itself isn't the reason a request would fail —
        // isolates the oversized-body test above to the size limit specifically.
        var content = new StringContent(
            "{\"email\":\"nobody@example.com\",\"password\":\"WrongPassword1\"}",
            Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/auth/login", content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Contact_WithOversizedBody_RejectedWithPayloadTooLarge()
    {
        // ContactController's MaxContactBodyBytes is 32 KiB.
        var hugeMessage = new string('b', 200_000);
        var content = new StringContent(
            $"{{\"name\":\"A\",\"email\":\"a@example.com\",\"subject\":\"S\",\"message\":\"{hugeMessage}\"}}",
            Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/contact", content);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }
}
