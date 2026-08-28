namespace CvAnalyzer.Api.Models.Dtos;

/// <summary>Response shape for GET /api/cv/{id}.</summary>
public record CvDetailDto(Guid Id, string FileName, string ContentType, long FileSizeBytes, DateTime UploadedAt);
