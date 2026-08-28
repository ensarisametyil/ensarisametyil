using System.Text.Json;
using CvAnalyzer.Api.Models.Dtos;

namespace CvAnalyzer.Api.Services.AI;

public class CvAnalysisResponseParser : ICvAnalysisResponseParser
{
    private readonly ILogger<CvAnalysisResponseParser> _logger;

    public CvAnalysisResponseParser(ILogger<CvAnalysisResponseParser> logger)
    {
        _logger = logger;
    }

    public CvAnalysisResult Parse(string rawResponseText)
    {
        if (string.IsNullOrWhiteSpace(rawResponseText))
        {
            throw new AiResponseParsingException("The AI provider returned an empty response.");
        }

        var jsonText = StripCodeFenceIfPresent(rawResponseText.Trim());

        CvAnalysisResult? result;
        try
        {
            result = JsonSerializer.Deserialize<CvAnalysisResult>(jsonText);
        }
        catch (JsonException ex)
        {
            // Never log the raw CV text or the full AI response body — only that parsing failed.
            _logger.LogWarning(ex, "AI response could not be parsed as JSON.");
            throw new AiResponseParsingException("The AI provider's response was not valid JSON.", ex);
        }

        if (result is null || IsEffectivelyEmpty(result))
        {
            throw new AiResponseParsingException("The AI provider's response did not match the expected schema.");
        }

        return result with { OverallScore = Math.Clamp(result.OverallScore, 0, 100) };
    }

    private static bool IsEffectivelyEmpty(CvAnalysisResult result) =>
        result.OverallScore == 0 &&
        string.IsNullOrWhiteSpace(result.Summary) &&
        result.Strengths.Count == 0 &&
        result.Weaknesses.Count == 0 &&
        result.Skills.Count == 0;

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
