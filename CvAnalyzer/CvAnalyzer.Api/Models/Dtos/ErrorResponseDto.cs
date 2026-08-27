namespace CvAnalyzer.Api.Models.Dtos;

/// <summary>Consistent error body returned for 4xx/5xx responses across the API.</summary>
public record ErrorResponseDto(string Code, string Message);
