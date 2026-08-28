using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.AI;

/// <summary>
/// Real implementation of <see cref="IAnthropicMessagesGateway"/> — the only class in this
/// project that references the Anthropic SDK directly.
/// </summary>
public class AnthropicMessagesGateway : IAnthropicMessagesGateway
{
    private readonly AiOptions _options;
    private readonly ILogger<AnthropicMessagesGateway> _logger;

    // Built lazily rather than in the constructor: this service is registered once at DI
    // container build time, and a missing API key must only fail the specific /analyze call
    // that needs it — not the container's ability to construct CvController at all, which
    // would otherwise take the working /upload endpoint down with it.
    private readonly Lazy<AnthropicClient> _client;

    public AnthropicMessagesGateway(IOptions<AiOptions> options, ILogger<AnthropicMessagesGateway> logger)
    {
        _options = options.Value;
        _logger = logger;
        _client = new Lazy<AnthropicClient>(CreateClient);
    }

    private AnthropicClient CreateClient()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new AiConfigurationException(
                "AI provider API key is not configured. Set it via 'dotnet user-secrets set AI:ApiKey \"...\"' " +
                "in Development, or the AI__ApiKey environment variable in other environments.");
        }

        return new AnthropicClient { ApiKey = _options.ApiKey };
    }

    public async Task<string> SendAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default)
    {
        var client = _client.Value;

        // Temperature is deliberately left unset for current-generation models (Opus 5, Sonnet 5,
        // Fable 5): they reject any value other than 1.0 with a 400 since thinking is always on.
        // It's only honored here for the (opt-in, via config) case of pointing "Model" at an
        // older model that still supports it.
#pragma warning disable CS0618 // MessageCreateParams.Temperature is obsolete on current models
        var request = new MessageCreateParams
        {
            Model = _options.Model,
            MaxTokens = _options.MaxTokens,
            System = systemPrompt,
            Messages = [new() { Role = Role.User, Content = userMessage }],
            Temperature = _options.Temperature,
        };
#pragma warning restore CS0618

        Message response;
        try
        {
            response = await client.Messages.Create(request, cancellationToken);
        }
        catch (AnthropicRateLimitException ex)
        {
            _logger.LogWarning("AI provider rate limit exceeded.");
            throw new AiRateLimitExceededException("The AI provider rate limit was exceeded. Please try again shortly.", ex);
        }
        catch (AnthropicUnauthorizedException ex)
        {
            _logger.LogError("AI provider rejected the configured API key.");
            throw new AiConfigurationException("The AI provider rejected the configured credentials.", ex);
        }
        catch (Anthropic5xxException ex)
        {
            _logger.LogError(ex, "AI provider returned a server error.");
            throw new AiProviderUnavailableException("The AI provider is currently unavailable. Please try again later.", ex);
        }
        catch (AnthropicIOException ex)
        {
            _logger.LogError(ex, "Network failure while calling the AI provider.");
            throw new AiProviderUnavailableException("Could not reach the AI provider.", ex);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError("AI provider request timed out.");
            throw new AiProviderUnavailableException("The AI provider request timed out.");
        }
        catch (AnthropicApiException ex)
        {
            _logger.LogError(ex, "AI provider returned an error.");
            throw new AiProviderUnavailableException("The AI provider returned an error.", ex);
        }

        if (response.StopReason == "refusal")
        {
            _logger.LogWarning("AI provider declined to analyze the CV (stop_reason=refusal).");
            throw new AiResponseParsingException("The AI provider declined to analyze this document.");
        }

        return string.Concat(response.Content.Select(block => block.Value).OfType<TextBlock>().Select(t => t.Text));
    }
}
