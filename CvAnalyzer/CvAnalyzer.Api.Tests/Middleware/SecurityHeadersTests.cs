using CvAnalyzer.Api.Middleware;

namespace CvAnalyzer.Api.Tests.Middleware;

public class SecurityHeadersTests
{
    [Fact]
    public void Build_Development_OmitsContentSecurityPolicy()
    {
        var headers = SecurityHeaders.Build(isDevelopment: true);

        Assert.False(headers.ContainsKey("Content-Security-Policy"));
    }

    [Fact]
    public void Build_NonDevelopment_IncludesRestrictiveContentSecurityPolicy()
    {
        var headers = SecurityHeaders.Build(isDevelopment: false);

        Assert.True(headers.TryGetValue("Content-Security-Policy", out var csp));
        Assert.Contains("default-src 'none'", csp);
        Assert.Contains("frame-ancestors 'none'", csp);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Build_AlwaysIncludesCoreHeaders_RegardlessOfEnvironment(bool isDevelopment)
    {
        var headers = SecurityHeaders.Build(isDevelopment);

        Assert.Equal("nosniff", headers["X-Content-Type-Options"]);
        Assert.Equal("DENY", headers["X-Frame-Options"]);
        Assert.Equal("strict-origin-when-cross-origin", headers["Referrer-Policy"]);
        Assert.Contains("geolocation=()", headers["Permissions-Policy"]);
        Assert.Contains("camera=()", headers["Permissions-Policy"]);
    }
}
