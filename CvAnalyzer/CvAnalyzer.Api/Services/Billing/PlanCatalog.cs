using CvAnalyzer.Api.Models.Entities;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.Billing;

public class PlanCatalog : IPlanCatalog
{
    private static readonly IReadOnlySet<PlanFeature> FreeFeatures = new HashSet<PlanFeature>();

    // Infrastructure-ready set for Premium — none of these features have an endpoint yet (see
    // PlanFeature), but the entitlement already exists so building one later never touches this
    // catalog again.
    private static readonly IReadOnlySet<PlanFeature> PremiumFeatures = new HashSet<PlanFeature>
    {
        PlanFeature.AtsAnalysis,
        PlanFeature.JobDescriptionAnalysis,
        PlanFeature.CvRewrite,
        PlanFeature.AdvancedRecommendations,
    };

    private readonly PlanOptions _options;

    public PlanCatalog(IOptions<PlanOptions> options)
    {
        _options = options.Value;
    }

    public PlanDefinition GetPlan(PlanType plan) => plan switch
    {
        PlanType.Free => new PlanDefinition
        {
            Plan = PlanType.Free,
            MonthlyAnalysisLimit = _options.FreeMonthlyAnalysisLimit,
            Features = FreeFeatures,
        },
        PlanType.Premium => new PlanDefinition
        {
            Plan = PlanType.Premium,
            MonthlyAnalysisLimit = _options.PremiumMonthlyAnalysisLimit,
            Features = PremiumFeatures,
        },
        _ => throw new ArgumentOutOfRangeException(nameof(plan), plan, "Unknown plan type."),
    };
}
