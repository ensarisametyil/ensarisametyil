namespace CvAnalyzer.Api.Models.Dtos;

/// <summary>
/// Response shape for GET /api/analyses/{id}. Wraps the same CvAnalysisResult shape the
/// /analyze endpoint already returns, so the frontend can reuse its existing rendering for
/// the "Result" part unchanged.
/// </summary>
public record AnalysisDetailDto(Guid Id, Guid CvId, string CvFileName, DateTime CreatedAt, CvAnalysisResult Result);
