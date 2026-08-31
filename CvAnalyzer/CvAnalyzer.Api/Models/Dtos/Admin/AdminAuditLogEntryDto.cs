namespace CvAnalyzer.Api.Models.Dtos.Admin;

public record AdminAuditLogEntryDto(
    Guid Id, string AdminEmail, string Action, string? TargetEmail, string? Details, bool Success, DateTime CreatedAt);
