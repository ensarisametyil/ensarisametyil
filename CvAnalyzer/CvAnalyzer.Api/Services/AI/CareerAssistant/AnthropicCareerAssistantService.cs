using CvAnalyzer.Api.Models.Dtos.CareerAssistant;

namespace CvAnalyzer.Api.Services.AI.CareerAssistant;

/// <summary>
/// Claude (Anthropic) implementation of <see cref="ICareerAssistantService"/> — pure
/// orchestration, exactly like AnthropicCvAnalysisService: builds the prompt, delegates the
/// network call to the SAME <see cref="IAnthropicMessagesGateway"/> the base CV analysis already
/// uses (unmodified — this class is a second consumer of that one seam, not a second gateway),
/// and response validation to <see cref="ICareerAssistantResponseParser"/>.
/// </summary>
public class AnthropicCareerAssistantService : ICareerAssistantService
{
    private readonly IAnthropicMessagesGateway _gateway;
    private readonly ICareerAssistantResponseParser _responseParser;

    public AnthropicCareerAssistantService(IAnthropicMessagesGateway gateway, ICareerAssistantResponseParser responseParser)
    {
        _gateway = gateway;
        _responseParser = responseParser;
    }

    public async Task<JobMatchResult> AnalyzeJobMatchAsync(string cvText, string jobDescription, CancellationToken cancellationToken = default)
    {
        RequireNonEmpty(cvText, nameof(cvText));
        RequireNonEmpty(jobDescription, nameof(jobDescription));

        var raw = await _gateway.SendAsync(
            CareerAssistantPrompts.JobMatchSystemPrompt,
            CareerAssistantPrompts.BuildJobMatchUserMessage(cvText, jobDescription),
            cancellationToken);

        return _responseParser.ParseJobMatch(raw);
    }

    public async Task<AtsAnalysisResult> AnalyzeAtsAsync(string cvText, CancellationToken cancellationToken = default)
    {
        RequireNonEmpty(cvText, nameof(cvText));

        var raw = await _gateway.SendAsync(
            CareerAssistantPrompts.AtsAnalysisSystemPrompt,
            CareerAssistantPrompts.BuildAtsAnalysisUserMessage(cvText),
            cancellationToken);

        return _responseParser.ParseAtsAnalysis(raw);
    }

    public async Task<CvRewriteResult> RewriteCvAsync(string cvText, CancellationToken cancellationToken = default)
    {
        RequireNonEmpty(cvText, nameof(cvText));

        var raw = await _gateway.SendAsync(
            CareerAssistantPrompts.CvRewriteSystemPrompt,
            CareerAssistantPrompts.BuildCvRewriteUserMessage(cvText),
            cancellationToken);

        return _responseParser.ParseCvRewrite(raw);
    }

    public async Task<CareerRecommendationsResult> RecommendCareersAsync(string cvText, CancellationToken cancellationToken = default)
    {
        RequireNonEmpty(cvText, nameof(cvText));

        var raw = await _gateway.SendAsync(
            CareerAssistantPrompts.CareerRecommendationsSystemPrompt,
            CareerAssistantPrompts.BuildCareerRecommendationsUserMessage(cvText),
            cancellationToken);

        return _responseParser.ParseCareerRecommendations(raw);
    }

    public async Task<CoverLetterResult> GenerateCoverLetterAsync(string cvText, string jobDescription, string targetLanguage, CancellationToken cancellationToken = default)
    {
        RequireNonEmpty(cvText, nameof(cvText));
        RequireNonEmpty(jobDescription, nameof(jobDescription));
        RequireNonEmpty(targetLanguage, nameof(targetLanguage));

        var raw = await _gateway.SendAsync(
            CareerAssistantPrompts.CoverLetterSystemPrompt,
            CareerAssistantPrompts.BuildCoverLetterUserMessage(cvText, jobDescription, targetLanguage),
            cancellationToken);

        return _responseParser.ParseCoverLetter(raw);
    }

    private static void RequireNonEmpty(string value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Value cannot be empty.", paramName);
        }
    }
}
