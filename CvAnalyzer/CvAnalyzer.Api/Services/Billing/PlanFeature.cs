namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Premium-gated capabilities. None of these have an endpoint yet — this enum exists purely so
/// the entitlement check ("can this user use feature X") is centralized from day one, instead of
/// being invented ad hoc when ATS analysis / job-description matching / CV rewrite are actually
/// built. See <see cref="IFeatureEntitlementService"/>.
/// </summary>
public enum PlanFeature
{
    AtsAnalysis,
    JobDescriptionAnalysis,
    CvRewrite,
    AdvancedRecommendations,
}
