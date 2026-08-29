using System.Net;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Proves the health endpoints work without authentication and never leak anything (connection
/// string, exception, internal detail) in their body. GET /health (liveness, HealthController)
/// already existed; GET /health/ready (readiness — actually checks DB reachability) is new.
/// </summary>
public class HealthEndpointIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_WithoutAnyToken_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ok", body);
    }

    [Fact]
    public async Task HealthReady_WithoutAnyToken_ReturnsOk()
    {
        // CustomWebApplicationFactory swaps in an InMemory AppDbContext — always "reachable".
        var response = await _client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ready", body);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/health/ready")]
    public async Task HealthEndpoints_ResponseBody_NeverContainsConnectionStringOrExceptionDetail(string path)
    {
        var response = await _client.GetAsync(path);
        var body = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("Host=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password=", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Exception", body, StringComparison.OrdinalIgnoreCase);
    }
}
