namespace CvAnalyzer.Api.Middleware;

/// <summary>
/// The security response headers this app sends on every response (see Program.cs, which wires
/// this into an OnStarting callback so it applies even on error responses produced by the
/// exception-handler branch). Extracted into a pure, testable function rather than left inline —
/// a WebApplicationFactory-based integration test cannot cleanly exercise the Production-only
/// Content-Security-Policy branch (environment-swapping a deferred minimal-hosting builder mid-test
/// is fragile — see CvAnalyzer.Api.Tests git history), so this is verified with a plain unit test
/// instead.
/// </summary>
public static class SecurityHeaders
{
    /// <summary>
    /// Content-Security-Policy is omitted only when <paramref name="isDevelopment"/> is true —
    /// it would otherwise break Swagger UI's own inline scripts/styles, which are Development-only
    /// in the first place (see Program.cs). This is a pure JSON API with no HTML views of its own
    /// outside Swagger, so `default-src 'none'` is safe for every real (non-Development) response.
    /// </summary>
    public static IReadOnlyDictionary<string, string> Build(bool isDevelopment)
    {
        var headers = new Dictionary<string, string>
        {
            ["X-Content-Type-Options"] = "nosniff",
            ["X-Frame-Options"] = "DENY",
            ["Referrer-Policy"] = "strict-origin-when-cross-origin",
            ["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()",
        };

        if (!isDevelopment)
        {
            headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        }

        return headers;
    }
}
