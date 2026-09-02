using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>A cover letter generated only from the candidate's actual CV content and the target job description — never inventing experience, employers, or achievements (see CareerAssistantPrompts).</summary>
public record CoverLetterResult
{
    [JsonPropertyName("coverLetterText")]
    public string CoverLetterText { get; init; } = string.Empty;
}
