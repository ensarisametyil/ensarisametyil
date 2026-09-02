namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>
/// A/B comparison of two of the caller's own past CV analyses — computed purely from data
/// already on file (the base <c>Analysis</c> rows), never a new AI call. Kept intentionally
/// simple (a safe MVP, see docs/career-assistant.md's scope note) rather than an AI-narrated
/// diff, so it costs nothing in AI usage and its output is fully deterministic.
/// </summary>
public record CvComparisonResultDto(CvComparisonSide A, CvComparisonSide B, int ScoreDifference);

public record CvComparisonSide(
    Guid AnalysisId,
    Guid CvId,
    string CvFileName,
    int OverallScore,
    DateTime CreatedAt,
    List<string> UniqueStrengths,
    List<string> UniqueWeaknesses);
