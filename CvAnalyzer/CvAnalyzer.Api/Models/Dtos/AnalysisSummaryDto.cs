namespace CvAnalyzer.Api.Models.Dtos;

/// <summary>Row shape for GET /api/analyses — enough for a history list without fetching every field.</summary>
public record AnalysisSummaryDto(Guid Id, Guid CvId, string CvFileName, int OverallScore, string Summary, DateTime CreatedAt);
