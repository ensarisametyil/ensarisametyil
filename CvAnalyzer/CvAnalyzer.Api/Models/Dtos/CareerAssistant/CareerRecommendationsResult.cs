using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

public record CareerRecommendationsResult
{
    [JsonPropertyName("summary")]
    public string Summary { get; init; } = string.Empty;

    [JsonPropertyName("recommendations")]
    public List<CareerRecommendation> Recommendations { get; init; } = new();
}

/// <summary>One candidate job title suggested purely from what the CV actually demonstrates — never from skills/experience the candidate doesn't have (see CareerAssistantPrompts).</summary>
public record CareerRecommendation
{
    [JsonPropertyName("role")]
    public string Role { get; init; } = string.Empty;

    [JsonPropertyName("matchPercentage")]
    public int MatchPercentage { get; init; }

    /// <summary>Why this role fits, referencing only what's actually in the CV.</summary>
    [JsonPropertyName("reasoning")]
    public string Reasoning { get; init; } = string.Empty;
}
