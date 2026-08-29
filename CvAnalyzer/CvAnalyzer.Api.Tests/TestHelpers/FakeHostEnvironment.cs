using Microsoft.Extensions.FileProviders;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Minimal IHostEnvironment stand-in for AuthService's Development-only dev-token-logging branch. Defaults to "Production" (the safer default) — set EnvironmentName to "Development" only in a test that specifically wants to exercise that branch.</summary>
public class FakeHostEnvironment : Microsoft.Extensions.Hosting.IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Production";

    public string ApplicationName { get; set; } = "CvAnalyzer.Api.Tests";

    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
