namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// A persisted AI analysis run. Field shape mirrors CvAnalysisResult (Models/Dtos) exactly —
/// this is a deliberate redesign from the stage-2 placeholder schema (Score/MissingSkills/
/// Suggestions/JobMatches), which never matched what the AI pipeline actually returns.
/// </summary>
public class Analysis
{
    public Guid Id { get; set; }

    public Guid CvId { get; set; }

    /// <summary>
    /// Denormalized from Cv.UserId so "list my analyses" doesn't require joining through Cv,
    /// and so a future per-user usage/quota system can query straight off this table.
    /// </summary>
    public Guid UserId { get; set; }

    public int OverallScore { get; set; }

    public string Summary { get; set; } = string.Empty;

    public List<string> Strengths { get; set; } = new();

    public List<string> Weaknesses { get; set; } = new();

    public List<string> Skills { get; set; } = new();

    public string Experience { get; set; } = string.Empty;

    public string Education { get; set; } = string.Empty;

    public List<string> MissingKeywords { get; set; } = new();

    public List<string> Recommendations { get; set; } = new();

    /// <summary>Raw AI provider response text, kept for debugging/auditing.</summary>
    public string? RawAiResponse { get; set; }

    public DateTime CreatedAt { get; set; }

    public Cv Cv { get; set; } = null!;

    public User User { get; set; } = null!;
}
