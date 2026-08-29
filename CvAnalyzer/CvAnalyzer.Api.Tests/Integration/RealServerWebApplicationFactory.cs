using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Same app/config as <see cref="CustomWebApplicationFactory"/>, but bound to a real Kestrel
/// listener on a loopback port instead of the in-memory TestServer. Needed specifically for
/// [RequestSizeLimit] — that attribute relies on IHttpMaxRequestBodySizeFeature, which TestServer
/// explicitly does not implement ("This server does not support the IHttpMaxRequestBodySizeFeature"
/// is logged and the limit silently becomes a no-op under TestServer), so proving it actually
/// rejects an oversized body requires a real HTTP transport. This is the pattern documented by
/// ASP.NET Core itself for testing real-server behavior (e.g. SignalR/WebSockets) with
/// WebApplicationFactory: https://learn.microsoft.com/aspnet/core/test/integration-tests#set-up-swagger-jwt-and-nswag-or-real-server-behavior
/// </summary>
public class RealServerWebApplicationFactory : CustomWebApplicationFactory
{
    private IHost? _host;

    /// <summary>
    /// The real Kestrel listener's base address. A plain <see cref="HttpClient"/> pointed at this
    /// (rather than <see cref="WebApplicationFactory{TEntryPoint}.CreateClient"/>, which always
    /// dispatches through the in-memory TestServer handler regardless of BaseAddress) is what
    /// actually exercises the real HTTP transport.
    /// </summary>
    public Uri RealServerBaseAddress { get; private set; } = null!;

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Build (but don't start) the TestServer-backed host first — the deferred host builder
        // used for minimal-hosting apps needs this to happen before the address becomes available
        // if we mutate the builder afterwards. See https://github.com/dotnet/aspnetcore/issues/33846.
        var testHost = builder.Build();

        builder.ConfigureWebHost(webHostBuilder => webHostBuilder.UseKestrel().UseUrls("http://127.0.0.1:0"));

        _host = builder.Build();
        _host.Start();

        var server = _host.Services.GetRequiredService<IServer>();
        var addresses = server.Features.Get<IServerAddressesFeature>();
        RealServerBaseAddress = addresses!.Addresses.Select(a => new Uri(a)).Last();

        testHost.Start();
        return testHost;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _host?.Dispose();
        }
    }
}
