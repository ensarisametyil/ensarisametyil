namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// A persisted result from one of the five Premium AI career-assistant features (Job Match, ATS
/// Analysis, CV Rewrite, Career Recommendations, Cover Letter — see CareerAssistantResultType).
/// Deliberately one shared, JSON-backed table rather than five separate ones: each feature's
/// result shape already lives as a typed C# record (Models/Dtos/CareerAssistant/*.cs) that
/// round-trips through <see cref="ResultJson"/> exactly like Analysis.RawAiResponse already does
/// for the base CV analysis — adding a fully-normalized table per feature would multiply the
/// migration surface five times for no benefit any current screen needs. Ordering by CreatedAt
/// per (UserId, CvId, Type) is what gives users a "history" of repeated runs (CV v1/v2/v3-style)
/// for each feature without any extra versioning field.
/// </summary>
public class CareerAssistantResult
{
    public Guid Id { get; set; }

    public Guid CvId { get; set; }

    /// <summary>Denormalized from Cv.UserId — same rationale as Analysis.UserId: ownership-scoped queries never need to join through Cv.</summary>
    public Guid UserId { get; set; }

    public CareerAssistantResultType Type { get; set; }

    /// <summary>
    /// The typed result (JobMatchResult/AtsAnalysisResult/CvRewriteResult/
    /// CareerRecommendationsResult/CoverLetterResult, selected by <see cref="Type"/>) serialized
    /// as JSON. Never includes the job description or any other raw input — only the AI's
    /// structured output about the candidate's own CV, mirroring Analysis's existing discipline
    /// of never persisting anything beyond what's needed to redisplay a past result.
    /// </summary>
    public string ResultJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public Cv Cv { get; set; } = null!;

    public User User { get; set; } = null!;
}
