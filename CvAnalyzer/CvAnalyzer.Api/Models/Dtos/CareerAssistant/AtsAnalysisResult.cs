using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>
/// ATS (Applicant Tracking System) compatibility ESTIMATE — deliberately never framed as a
/// guarantee of how any real ATS product will behave (see CareerAssistantPrompts' system prompt
/// and the frontend copy that renders this). Real ATS software varies by vendor and is a black
/// box from the outside; this is CVora AI's own structural/keyword/formatting heuristic estimate.
/// </summary>
public record AtsAnalysisResult
{
    [JsonPropertyName("atsScore")]
    public int AtsScore { get; init; }

    [JsonPropertyName("structureScore")]
    public int StructureScore { get; init; }

    [JsonPropertyName("keywordUsageScore")]
    public int KeywordUsageScore { get; init; }

    [JsonPropertyName("formattingScore")]
    public int FormattingScore { get; init; }

    [JsonPropertyName("readabilityScore")]
    public int ReadabilityScore { get; init; }

    [JsonPropertyName("summary")]
    public string Summary { get; init; } = string.Empty;

    /// <summary>What the CV already does well for ATS parsing.</summary>
    [JsonPropertyName("strengths")]
    public List<string> Strengths { get; init; } = new();

    /// <summary>Specific structural/formatting elements likely to confuse an ATS parser (tables, columns, headers-as-images, missing section headings, etc.).</summary>
    [JsonPropertyName("risks")]
    public List<string> Risks { get; init; } = new();

    [JsonPropertyName("recommendations")]
    public List<string> Recommendations { get; init; } = new();
}
