namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>One row of GET /api/career-assistant/history — mirrors AnalysisSummaryDto's shape/purpose for the base CV analysis history.</summary>
public record CareerAssistantResultSummaryDto(Guid Id, Guid CvId, string CvFileName, string Type, DateTime CreatedAt);
