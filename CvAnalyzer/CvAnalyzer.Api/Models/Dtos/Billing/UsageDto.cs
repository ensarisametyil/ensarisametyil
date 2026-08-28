namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>
/// Response of GET /api/billing/usage. Limit/Remaining are null for an unlimited plan — the
/// frontend must branch on null explicitly rather than treating a magic number (e.g. -1) as
/// "unlimited".
/// </summary>
public record UsageDto(string Plan, int Used, int? Limit, int? Remaining, DateTime PeriodStart, DateTime PeriodEnd);
