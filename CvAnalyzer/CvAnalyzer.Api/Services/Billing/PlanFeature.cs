namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Premium-gated capabilities, enforced centrally via <see cref="IFeatureEntitlementService"/>
/// rather than an ad hoc check per endpoint. The first four were reserved (with no endpoint yet)
/// before the Career Assistant feature set existed and are now wired up by
/// CareerAssistantController exactly as originally anticipated: AtsAnalysis -> POST
/// ats-analysis, JobDescriptionAnalysis -> POST job-match, CvRewrite -> POST rewrite,
/// AdvancedRecommendations -> POST career-recommendations. CoverLetterGeneration and
/// CvComparison are new, added for that same controller's cover-letter and compare endpoints.
/// </summary>
public enum PlanFeature
{
    AtsAnalysis,
    JobDescriptionAnalysis,
    CvRewrite,
    AdvancedRecommendations,
    CoverLetterGeneration,
    CvComparison,
}
