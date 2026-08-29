using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using CvAnalyzer.Api.Services.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.AI;

/// <summary>
/// Proves the AI request timeout is a real, enforced bound — not just a configured number that
/// nothing actually applies. A local TCP listener accepts the connection but never writes a
/// response, simulating a stalled/unreachable provider without ever touching the real Anthropic
/// API (forbidden in this environment). Uses AiOptions.BaseUrl to point the gateway at this local
/// listener instead.
/// </summary>
public class AnthropicMessagesGatewayTimeoutTests
{
    [Fact]
    public async Task SendAsync_ProviderConnectsButNeverResponds_ThrowsAiProviderUnavailableWithinBoundedTime()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        // Accept connections forever but never write anything back — the request hangs until
        // something (the client's own Timeout) gives up on it.
        var acceptLoopCts = new CancellationTokenSource();
        var acceptTask = Task.Run(async () =>
        {
            try
            {
                while (!acceptLoopCts.IsCancellationRequested)
                {
                    using var client = await listener.AcceptTcpClientAsync(acceptLoopCts.Token);
                    await Task.Delay(Timeout.Infinite, acceptLoopCts.Token).ContinueWith(_ => { }, TaskScheduler.Default);
                }
            }
            catch (OperationCanceledException)
            {
                // Expected on test teardown.
            }
        });

        try
        {
            var options = Options.Create(new AiOptions
            {
                ApiKey = "test-only-key-never-sent-to-a-real-provider",
                BaseUrl = $"http://127.0.0.1:{port}",
                TimeoutSeconds = 1,
            });
            var sut = new AnthropicMessagesGateway(options, NullLogger<AnthropicMessagesGateway>.Instance);

            var stopwatch = Stopwatch.StartNew();

            // Bounded outer timeout too: if AnthropicClient.Timeout somehow didn't fire, this
            // test would fail loudly (timeout) rather than hang the whole test run.
            using var testGuardCts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            await Assert.ThrowsAsync<AiProviderUnavailableException>(
                () => sut.SendAsync("system prompt", "user message", testGuardCts.Token));

            stopwatch.Stop();

            // The configured 1-second client timeout must actually have bounded the call — not
            // the 15-second test guard, and not an instant, un-attempted failure either.
            Assert.InRange(stopwatch.Elapsed, TimeSpan.FromMilliseconds(500), TimeSpan.FromSeconds(10));
        }
        finally
        {
            acceptLoopCts.Cancel();
            listener.Stop();
            await Task.WhenAny(acceptTask, Task.Delay(TimeSpan.FromSeconds(2)));
        }
    }
}
