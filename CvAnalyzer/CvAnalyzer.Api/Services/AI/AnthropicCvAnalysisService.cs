using CvAnalyzer.Api.Models.Dtos;

namespace CvAnalyzer.Api.Services.AI;

/// <summary>
/// Claude (Anthropic) implementation of <see cref="IAiCvAnalysisService"/>. Pure orchestration:
/// builds the prompt, delegates the network call to <see cref="IAnthropicMessagesGateway"/> and
/// response validation to <see cref="ICvAnalysisResponseParser"/>. Nothing outside this file's
/// two collaborators knows the Messages API shape or any provider-specific SDK type — the
/// controller only ever sees <see cref="IAiCvAnalysisService"/> and the exceptions declared
/// alongside it, so the provider could be swapped without touching the controller.
/// </summary>
public class AnthropicCvAnalysisService : IAiCvAnalysisService
{
    private readonly IAnthropicMessagesGateway _gateway;
    private readonly ICvAnalysisResponseParser _responseParser;

    public AnthropicCvAnalysisService(IAnthropicMessagesGateway gateway, ICvAnalysisResponseParser responseParser)
    {
        _gateway = gateway;
        _responseParser = responseParser;
    }

    public async Task<CvAnalysisResult> AnalyzeCvAsync(string cvText, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(cvText))
        {
            throw new ArgumentException("CV text to analyze cannot be empty.", nameof(cvText));
        }

        var rawResponseText = await _gateway.SendAsync(
            CvAnalysisPrompts.SystemPrompt,
            CvAnalysisPrompts.BuildUserMessage(cvText),
            cancellationToken);

        return _responseParser.Parse(rawResponseText);
    }
}
