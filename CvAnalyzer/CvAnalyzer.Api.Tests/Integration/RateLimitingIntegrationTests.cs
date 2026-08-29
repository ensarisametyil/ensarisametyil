using System.Net;
using System.Net.Http.Json;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Proves the rate limiter actually rejects excess requests with 429 — something only observable
/// through the real HTTP pipeline (UseRateLimiter() middleware + [EnableRateLimiting] attribute),
/// not from a controller-level unit test. Uses its own <see cref="CustomWebApplicationFactory"/>
/// instance (xUnit's IClassFixture gives every test class its own instance, hence its own
/// in-process rate limiter state) at the app's real configured default (20/60s from
/// appsettings.json) rather than a contrived tight limit, so this exercises the actual production
/// configuration.
/// </summary>
public class RateLimitingIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public RateLimitingIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_ExceedingThePermitLimit_ReturnsTooManyRequestsWithSafeErrorBody()
    {
        // The default policy (appsettings.json) permits 20 requests/minute — all of them fail
        // authentication (wrong password), which is fine: the limiter counts requests, not outcomes.
        HttpResponseMessage? lastAllowedResponse = null;
        for (var i = 0; i < 20; i++)
        {
            lastAllowedResponse = await _client.PostAsJsonAsync("/api/auth/login", new { email = "nobody@example.com", password = "WrongPassword1" });
        }
        Assert.NotEqual(HttpStatusCode.TooManyRequests, lastAllowedResponse!.StatusCode);

        var rejectedResponse = await _client.PostAsJsonAsync("/api/auth/login", new { email = "nobody@example.com", password = "WrongPassword1" });

        Assert.Equal(HttpStatusCode.TooManyRequests, rejectedResponse.StatusCode);
        var body = await rejectedResponse.Content.ReadAsStringAsync();
        Assert.Contains("RATE_LIMITED", body);
        Assert.DoesNotContain("Exception", body);
    }

    [Fact]
    public async Task NonRateLimitedEndpoint_UnaffectedByTheAuthPolicysLimit()
    {
        for (var i = 0; i < 5; i++)
        {
            var response = await _client.GetAsync("/api/auth/me");
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }
    }
}
