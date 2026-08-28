namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Bound from the "Plans" configuration section — the single place plan limits are configured.
/// Nothing about limits is hard-coded elsewhere; change these values (appsettings.json, an
/// environment variable override, etc.) without touching any service or controller code.
/// Plan pricing is deliberately not modeled here — see docs/monetization.md.
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
}
