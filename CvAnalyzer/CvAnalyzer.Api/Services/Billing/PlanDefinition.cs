using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Everything a plan actually grants, resolved once (by <see cref="IPlanCatalog"/>) from
/// configuration rather than re-derived or hard-coded at each call site.
/// </summary>
public sealed class PlanDefinition
{
    public required PlanType Plan { get; init; }

    /// <summary>Analyses allowed per calendar month. Null means unlimited.</summary>
    public required int? MonthlyAnalysisLimit { get; init; }

    /// <summary>Monthly price in USD — null for Free (nothing to charge). Resolved once, here, from PlanOptions; never from a request.</summary>
    public required decimal? MonthlyPriceUsd { get; init; }

    public required IReadOnlySet<PlanFeature> Features { get; init; }

    public bool HasFeature(PlanFeature feature) => Features.Contains(feature);
}
