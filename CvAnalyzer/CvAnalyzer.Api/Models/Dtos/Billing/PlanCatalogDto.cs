namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>One plan's public catalog info — what it grants and what it costs. Never anything user-specific (that's GET /api/billing/usage).</summary>
public record PlanPricingDto(int? MonthlyAnalysisLimit, decimal? MonthlyPriceUsd, string? Currency);

/// <summary>
/// Response of GET /api/billing/plans — the single backend-owned source of truth for plan
/// limits/pricing (see PlanCatalog), safe to expose to an unauthenticated visitor (the public
/// Landing page needs to show Premium's price before anyone signs in) since it carries nothing
/// user-specific.
/// </summary>
public record PlanCatalogDto(PlanPricingDto Free, PlanPricingDto Premium);
