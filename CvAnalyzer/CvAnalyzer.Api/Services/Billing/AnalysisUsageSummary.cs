using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Billing;

/// <summary>Everything the frontend needs to render "plan + usage" in one response (GET /api/billing/usage).</summary>
public sealed record AnalysisUsageSummary(
    PlanType Plan,
    int Used,
    int? Limit,
    int? Remaining,
    DateTime PeriodStart,
    DateTime PeriodEnd);
