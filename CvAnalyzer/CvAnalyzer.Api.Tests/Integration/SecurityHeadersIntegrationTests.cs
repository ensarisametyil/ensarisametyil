using System.Linq;
using System.Net.Http.Json;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>Proves security response headers are present on real HTTP responses — including error responses (401), where a middleware that only sets headers "before next()" without OnStarting could silently be bypassed by the exception-handler branch. Content-Security-Policy's Development-vs-Production behavior is verified separately, as a plain unit test on Middleware/SecurityHeaders.Build (see SecurityHeadersTests.cs) — swapping environments mid-integration-test against a minimal-hosting app proved too fragile.</summary>
public class SecurityHeadersIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public SecurityHeadersIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task EveryResponse_IncludesCoreSecurityHeaders_EvenAnErrorResponse()
    {
        // /api/auth/me without a token is a 401 — proves the headers survive the auth-failure path.
        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal("nosniff", Single(response, "X-Content-Type-Options"));
        Assert.Equal("DENY", Single(response, "X-Frame-Options"));
        Assert.Equal("strict-origin-when-cross-origin", Single(response, "Referrer-Policy"));
        Assert.Contains("geolocation=()", Single(response, "Permissions-Policy"));
    }

    [Fact]
    public async Task SuccessfulResponse_AlsoIncludesCoreSecurityHeaders()
    {
        var email = $"headers-{Guid.NewGuid():N}@example.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "Password123" });

        Assert.Equal("nosniff", Single(response, "X-Content-Type-Options"));
    }

    [Fact]
    public async Task DevelopmentEnvironment_OmitsContentSecurityPolicy_SoSwaggerUiStillWorks()
    {
        // CustomWebApplicationFactory runs under WebApplicationFactory's default environment
        // ("Development") — the same environment name Program.cs uses to decide whether to
        // register Swagger at all, so this is exercising the real condition, not a stand-in.
        var response = await _client.GetAsync("/api/auth/me");

        Assert.False(response.Headers.Contains("Content-Security-Policy"));
    }

    private static string Single(HttpResponseMessage response, string headerName) =>
        response.Headers.TryGetValues(headerName, out var values) ? values.Single() : throw new Xunit.Sdk.XunitException($"Missing header {headerName}");
}
