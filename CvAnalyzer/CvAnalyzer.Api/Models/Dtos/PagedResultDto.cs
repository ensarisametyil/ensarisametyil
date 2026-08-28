namespace CvAnalyzer.Api.Models.Dtos;

public record PagedResultDto<T>(List<T> Items, int Page, int PageSize, int TotalCount);
