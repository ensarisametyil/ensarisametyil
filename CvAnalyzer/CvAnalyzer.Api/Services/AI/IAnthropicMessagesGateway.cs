namespace CvAnalyzer.Api.Services.AI;

/// <summary>
/// Thin wrapper around the raw Anthropic Messages API call. Isolates SDK types and exception
/// translation from prompt construction and response parsing, so the orchestration
/// (<see cref="AnthropicCvAnalysisService"/>) can be unit tested with a fake at this seam
/// instead of needing real network access.
/// </summary>
public interface IAnthropicMessagesGateway
{
    /// <summary>
    /// Sends a single-turn request and returns the concatenated text of the response.
    /// Throws the <see cref="AiAnalysisException"/> subclasses in this namespace for every
    /// provider-side failure (missing configuration, unreachable provider, rate limiting,
    /// a declined/refused request).
    /// </summary>
    Task<string> SendAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default);
}
