using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>
/// CVora AI's own composite CV score — deliberately NOT an AI call. Computed deterministically
/// by <see cref="Services.AI.CareerAssistant.CvoraScoreCalculator"/> from data already on file
/// (the CV's latest base <c>Analysis</c>, plus its latest <see cref="AtsAnalysisResult"/> when
/// one exists) so it costs nothing extra in AI usage and the same inputs always produce the same
/// score. See CvoraScoreCalculator for exactly how each component is derived — no magic numbers,
/// every weight is a named constant.
/// </summary>
public record CvoraScoreResult
{
    [JsonPropertyName("cvoraScore")]
    public int CvoraScore { get; init; }

    [JsonPropertyName("components")]
    public required CvoraScoreComponents Components { get; init; }

    /// <summary>The Analysis row this score was derived from.</summary>
    [JsonPropertyName("basedOnAnalysisId")]
    public Guid BasedOnAnalysisId { get; init; }

    /// <summary>The ATS analysis row this score incorporated, if the user has run one for this CV.</summary>
    [JsonPropertyName("basedOnAtsAnalysisId")]
    public Guid? BasedOnAtsAnalysisId { get; init; }
}

public record CvoraScoreComponents
{
    [JsonPropertyName("contentQuality")]
    public int ContentQuality { get; init; }

    [JsonPropertyName("skills")]
    public int Skills { get; init; }

    [JsonPropertyName("experience")]
    public int Experience { get; init; }

    [JsonPropertyName("structure")]
    public int Structure { get; init; }

    [JsonPropertyName("readability")]
    public int Readability { get; init; }

    /// <summary>Null until the user has run an ATS Analysis for this CV — see CvoraScoreCalculator.</summary>
    [JsonPropertyName("atsCompatibility")]
    public int? AtsCompatibility { get; init; }
}
