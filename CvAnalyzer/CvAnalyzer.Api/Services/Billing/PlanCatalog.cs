using CvAnalyzer.Api.Models.Entities;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.Billing;

public class PlanCatalog : IPlanCatalog
{
    private static readonly IReadOnlySet<PlanFeature> FreeFeatures = new HashSet<PlanFeature>();

    // Every Career Assistant AI feature (CareerAssistantController) is Premium-only — see
    // PlanFeature's doc comment for which endpoint each one gates.
    private static readonly IReadOnlySet<PlanFeature> PremiumFeatures = new HashSet<PlanFeature>
    {
        PlanFeature.AtsAnalysis,
        PlanFeature.JobDescriptionAnalysis,
        PlanFeature.CvRewrite,
        PlanFeature.AdvancedRecommendations,
        PlanFeature.CoverLetterGeneration,
        PlanFeature.CvComparison,
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
            MonthlyPriceUsd = null,
            Features = FreeFeatures,
        },
        PlanType.Premium => new PlanDefinition
        {
            Plan = PlanType.Premium,
            MonthlyAnalysisLimit = _options.PremiumMonthlyAnalysisLimit,
            MonthlyPriceUsd = _options.PremiumMonthlyPriceUsd,
            Features = PremiumFeatures,
        },
        _ => throw new ArgumentOutOfRangeException(nameof(plan), plan, "Unknown plan type."),
    };
}
