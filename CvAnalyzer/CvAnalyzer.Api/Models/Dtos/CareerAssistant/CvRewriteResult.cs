using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

public record CvRewriteResult
{
    [JsonPropertyName("summary")]
    public string Summary { get; init; } = string.Empty;

    [JsonPropertyName("suggestions")]
    public List<CvRewriteSuggestion> Suggestions { get; init; } = new();
}

/// <summary>
/// One weak-to-improved rewrite pair. The AI is instructed (see CareerAssistantPrompts) to only
/// rephrase what is already in the CV — never invent a new employer, technology, metric, or
/// achievement the candidate didn't already state.
/// </summary>
public record CvRewriteSuggestion
{
    /// <summary>One of a fixed set of section labels the prompt asks for: "summary", "experience", "skills", "projects", "other".</summary>
    [JsonPropertyName("section")]
    public string Section { get; init; } = string.Empty;

    [JsonPropertyName("original")]
    public string Original { get; init; } = string.Empty;

    [JsonPropertyName("improved")]
    public string Improved { get; init; } = string.Empty;

    [JsonPropertyName("reason")]
    public string Reason { get; init; } = string.Empty;
}
