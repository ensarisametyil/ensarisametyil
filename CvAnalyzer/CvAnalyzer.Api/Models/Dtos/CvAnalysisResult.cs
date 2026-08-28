using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos;

/// <summary>
/// Structured CV analysis produced by an AI provider. This is both the AI service's return
/// type and the JSON body returned by the /analyze endpoint. Every list defaults to empty
/// (never null) so a partial AI response still serializes cleanly.
/// </summary>
public record CvAnalysisResult
{
    [JsonPropertyName("overallScore")]
    public int OverallScore { get; init; }

    [JsonPropertyName("summary")]
    public string Summary { get; init; } = string.Empty;

    [JsonPropertyName("strengths")]
    public List<string> Strengths { get; init; } = new();

    [JsonPropertyName("weaknesses")]
    public List<string> Weaknesses { get; init; } = new();

    [JsonPropertyName("skills")]
    public List<string> Skills { get; init; } = new();

    [JsonPropertyName("experience")]
    public string Experience { get; init; } = string.Empty;

    [JsonPropertyName("education")]
    public string Education { get; init; } = string.Empty;

    [JsonPropertyName("missingKeywords")]
    public List<string> MissingKeywords { get; init; } = new();

    [JsonPropertyName("recommendations")]
    public List<string> Recommendations { get; init; } = new();
}
