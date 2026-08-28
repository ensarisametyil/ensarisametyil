using CvAnalyzer.Api.Services.AI;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.AI;

/// <summary>
/// Tests the real <see cref="AnthropicMessagesGateway"/> for the one failure mode that never
/// needs network access: a missing API key must fail fast and locally, before any HTTP call
/// is attempted — proving the app behaves in a controlled way when unconfigured.
/// </summary>
public class AnthropicMessagesGatewayTests
{
    [Fact]
    public async Task SendAsync_MissingApiKey_ThrowsAiConfigurationExceptionWithoutNetworkCall()
    {
        var options = Options.Create(new AiOptions { ApiKey = null });
        var sut = new AnthropicMessagesGateway(options, NullLogger<AnthropicMessagesGateway>.Instance);

        // Bounded timeout: if this ever tried a real network call instead of failing fast
        // locally, the test would hang/timeout here rather than silently pass.
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await Assert.ThrowsAsync<AiConfigurationException>(
            () => sut.SendAsync("system prompt", "user message", cts.Token));
    }

    [Fact]
    public async Task SendAsync_BlankApiKey_ThrowsAiConfigurationException()
    {
        var options = Options.Create(new AiOptions { ApiKey = "   " });
        var sut = new AnthropicMessagesGateway(options, NullLogger<AnthropicMessagesGateway>.Instance);

        await Assert.ThrowsAsync<AiConfigurationException>(
            () => sut.SendAsync("system prompt", "user message"));
    }
}
