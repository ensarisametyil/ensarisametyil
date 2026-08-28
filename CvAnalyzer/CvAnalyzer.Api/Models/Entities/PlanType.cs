namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// The two products a user can be on. Kept intentionally minimal (see docs/monetization.md) —
/// everything about what each plan actually grants (limits, features) lives in
/// Services/Billing/PlanCatalog, never scattered across controllers or hard-coded per call site.
/// </summary>
public enum PlanType
{
    Free,
    Premium,
}
