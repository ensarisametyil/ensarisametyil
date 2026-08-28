namespace CvAnalyzer.Api.Models.Dtos;

/// <summary>Row shape for GET /api/cv (the caller's own CVs only).</summary>
public record CvSummaryDto(Guid Id, string FileName, DateTime UploadedAt);
