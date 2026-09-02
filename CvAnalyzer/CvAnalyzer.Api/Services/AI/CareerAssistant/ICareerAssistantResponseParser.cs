using CvAnalyzer.Api.Models.Dtos.CareerAssistant;

namespace CvAnalyzer.Api.Services.AI.CareerAssistant;

/// <summary>
/// Turns the AI provider's raw text response into one of the five typed Career Assistant result
/// records. Mirrors ICvAnalysisResponseParser's contract exactly: every method throws
/// <see cref="AiResponseParsingException"/> (the same exception type CvAnalysisResponseParser
/// already uses — no new exception type needed) for an empty response, invalid JSON, or a
/// response that doesn't match the expected schema.
/// </summary>
public interface ICareerAssistantResponseParser
{
    JobMatchResult ParseJobMatch(string rawResponseText);

    AtsAnalysisResult ParseAtsAnalysis(string rawResponseText);

    CvRewriteResult ParseCvRewrite(string rawResponseText);

    CareerRecommendationsResult ParseCareerRecommendations(string rawResponseText);

    CoverLetterResult ParseCoverLetter(string rawResponseText);
}
