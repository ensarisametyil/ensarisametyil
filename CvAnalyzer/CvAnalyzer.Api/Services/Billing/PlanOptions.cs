namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Bound from the "Plans" configuration section — the single place plan limits (and, as of
/// Stage 15, Premium's price) are configured. Nothing about limits or price is hard-coded
/// elsewhere; change these values (appsettings.json, an environment variable override, etc.)
/// without touching any service or controller code.
/// </summary>
public class PlanOptions
{
    public const string SectionName = "Plans";

    /// <summary>Analyses a Free user may run per calendar month.</summary>
    public int FreeMonthlyAnalysisLimit { get; set; } = 2;

    /// <summary>
    /// Analyses a Premium user may run per calendar month. Null means unlimited. Kept
    /// configurable (rather than hard-coded "unlimited") so a future cap can be introduced purely
    /// via configuration if AI cost needs to be controlled, without a code change.
    /// </summary>
    public int? PremiumMonthlyAnalysisLimit { get; set; }

    /// <summary>
    /// Premium's monthly price in USD — the single backend-owned source of truth (see
    /// PlanCatalog/PlanDefinition). Never read from a request; a client can only ever start a
    /// checkout (CheckoutRequestDto carries no price/amount/currency field at all) and every
    /// amount this app records or displays is resolved from here, not from anything the caller
    /// sent. Free has no price (null) by definition — there is nothing to charge for it.
    /// </summary>
    public decimal PremiumMonthlyPriceUsd { get; set; } = 10.00m;
}
