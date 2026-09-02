using System.Text.Json;

namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>
/// GET /api/career-assistant/history/{id} — <paramref name="Result"/> is the stored
/// CareerAssistantResult.ResultJson re-parsed as a JsonElement so it serializes back out as the
/// same typed shape (JobMatchResult/AtsAnalysisResult/CvRewriteResult/CareerRecommendationsResult/
/// CoverLetterResult) it was originally produced as, keyed by <paramref name="Type"/> — mirrors
/// AnalysisDetailDto's approach for the base CV analysis.
/// </summary>
public record CareerAssistantResultDetailDto(Guid Id, Guid CvId, string CvFileName, string Type, DateTime CreatedAt, JsonElement Result);
