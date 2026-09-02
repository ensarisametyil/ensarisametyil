using System.Text.Json;
using CvAnalyzer.Api.Models.Dtos.CareerAssistant;

namespace CvAnalyzer.Api.Services.AI.CareerAssistant;

/// <summary>
/// Same parsing discipline as CvAnalysisResponseParser (code-fence stripping, JSON validation,
/// empty-response rejection, score clamping) applied to the five Career Assistant result shapes.
/// Kept as its own implementation rather than modifying/generalizing the existing
/// CvAnalysisResponseParser — that class is working code exercising a single, unrelated shape;
/// duplicating its small stripping helper here is a safer, more isolated change than reshaping it
/// into a shared generic utility.
/// </summary>
public class CareerAssistantResponseParser : ICareerAssistantResponseParser
{
    private readonly ILogger<CareerAssistantResponseParser> _logger;

    public CareerAssistantResponseParser(ILogger<CareerAssistantResponseParser> logger)
    {
        _logger = logger;
    }

    public JobMatchResult ParseJobMatch(string rawResponseText)
    {
        var result = Deserialize<JobMatchResult>(rawResponseText);
        if (IsEffectivelyEmpty(result))
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected job-match schema.");
        }

        return result with
        {
            OverallScore = Clamp(result.OverallScore),
            SkillsScore = Clamp(result.SkillsScore),
            ExperienceScore = Clamp(result.ExperienceScore),
            KeywordsScore = Clamp(result.KeywordsScore),
            EducationScore = Clamp(result.EducationScore),
        };

        static bool IsEffectivelyEmpty(JobMatchResult r) =>
            r.OverallScore == 0 && string.IsNullOrWhiteSpace(r.Summary) &&
            r.RequiredSkills.Count == 0 && r.MatchedSkills.Count == 0 && r.MissingSkills.Count == 0 && r.Strengths.Count == 0;
    }

    public AtsAnalysisResult ParseAtsAnalysis(string rawResponseText)
    {
        var result = Deserialize<AtsAnalysisResult>(rawResponseText);
        if (result.AtsScore == 0 && string.IsNullOrWhiteSpace(result.Summary) && result.Strengths.Count == 0 && result.Risks.Count == 0)
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected ATS-analysis schema.");
        }

        return result with
        {
            AtsScore = Clamp(result.AtsScore),
            StructureScore = Clamp(result.StructureScore),
            KeywordUsageScore = Clamp(result.KeywordUsageScore),
            FormattingScore = Clamp(result.FormattingScore),
            ReadabilityScore = Clamp(result.ReadabilityScore),
        };
    }

    public CvRewriteResult ParseCvRewrite(string rawResponseText)
    {
        var result = Deserialize<CvRewriteResult>(rawResponseText);
        if (string.IsNullOrWhiteSpace(result.Summary) && result.Suggestions.Count == 0)
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected CV-rewrite schema.");
        }

        return result;
    }

    public CareerRecommendationsResult ParseCareerRecommendations(string rawResponseText)
    {
        var result = Deserialize<CareerRecommendationsResult>(rawResponseText);
        if (result.Recommendations.Count == 0 && string.IsNullOrWhiteSpace(result.Summary))
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected career-recommendations schema.");
        }

        return result with
        {
            Recommendations = result.Recommendations.Select(r => r with { MatchPercentage = Clamp(r.MatchPercentage) }).ToList(),
        };
    }

    public CoverLetterResult ParseCoverLetter(string rawResponseText)
    {
        var result = Deserialize<CoverLetterResult>(rawResponseText);
        if (string.IsNullOrWhiteSpace(result.CoverLetterText))
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected cover-letter schema.");
        }

        return result;
    }

    private T Deserialize<T>(string rawResponseText) where T : class
    {
        if (string.IsNullOrWhiteSpace(rawResponseText))
        {
            throw new AiResponseParsingException("The AI provider returned an empty response.");
        }

        var jsonText = StripCodeFenceIfPresent(rawResponseText.Trim());

        T? result;
        try
        {
            result = JsonSerializer.Deserialize<T>(jsonText);
        }
        catch (JsonException ex)
        {
            // Never log the raw CV text, job description, or the full AI response body — only
            // that parsing failed (same discipline as CvAnalysisResponseParser).
            _logger.LogWarning(ex, "Career Assistant AI response could not be parsed as JSON.");
            throw new AiResponseParsingException("The AI provider's response was not valid JSON.", ex);
        }

        if (result is null)
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected schema.");
        }

        return result;
    }

    private static int Clamp(int score) => Math.Clamp(score, 0, 100);

    private static string StripCodeFenceIfPresent(string text)
    {
        if (!text.StartsWith("```", StringComparison.Ordinal))
        {
            return text;
        }

        var withoutOpeningFence = text[3..].TrimStart();
        if (withoutOpeningFence.StartsWith("json", StringComparison.OrdinalIgnoreCase))
        {
            withoutOpeningFence = withoutOpeningFence[4..].TrimStart();
        }

        var closingFenceIndex = withoutOpeningFence.LastIndexOf("```", StringComparison.Ordinal);
        return closingFenceIndex >= 0 ? withoutOpeningFence[..closingFenceIndex].Trim() : withoutOpeningFence;
    }
}
