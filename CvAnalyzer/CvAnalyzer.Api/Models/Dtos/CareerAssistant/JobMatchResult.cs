using System.Text.Json.Serialization;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>
/// Structured CV-to-job-description match produced by the AI. Every list defaults to empty
/// (never null) so a partial AI response still serializes cleanly — same discipline as
/// CvAnalysisResult.
/// </summary>
public record JobMatchResult
{
    [JsonPropertyName("overallScore")]
    public int OverallScore { get; init; }

    [JsonPropertyName("skillsScore")]
    public int SkillsScore { get; init; }

    [JsonPropertyName("experienceScore")]
    public int ExperienceScore { get; init; }

    [JsonPropertyName("keywordsScore")]
    public int KeywordsScore { get; init; }

    [JsonPropertyName("educationScore")]
    public int EducationScore { get; init; }

    [JsonPropertyName("summary")]
    public string Summary { get; init; } = string.Empty;

    /// <summary>Skills the job description explicitly requires.</summary>
    [JsonPropertyName("requiredSkills")]
    public List<string> RequiredSkills { get; init; } = new();

    /// <summary>Skills the job description lists as nice-to-have.</summary>
    [JsonPropertyName("preferredSkills")]
    public List<string> PreferredSkills { get; init; } = new();

    /// <summary>Required/preferred skills the CV actually demonstrates.</summary>
    [JsonPropertyName("matchedSkills")]
    public List<string> MatchedSkills { get; init; } = new();

    /// <summary>Required/preferred skills the CV does not demonstrate.</summary>
    [JsonPropertyName("missingSkills")]
    public List<string> MissingSkills { get; init; } = new();

    /// <summary>Why this candidate is a strong fit for this specific role.</summary>
    [JsonPropertyName("strengths")]
    public List<string> Strengths { get; init; } = new();

    /// <summary>Where this candidate falls short of this specific role's requirements.</summary>
    [JsonPropertyName("gaps")]
    public List<string> Gaps { get; init; } = new();

    /// <summary>Specific, actionable changes to make to the CV to better target this role.</summary>
    [JsonPropertyName("suggestedCvChanges")]
    public List<string> SuggestedCvChanges { get; init; } = new();
}
