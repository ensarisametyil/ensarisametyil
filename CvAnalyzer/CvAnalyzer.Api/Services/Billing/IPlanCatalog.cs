using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Billing;

/// <summary>The single source of truth for "what does this plan grant" — see PlanDefinition.</summary>
public interface IPlanCatalog
{
    PlanDefinition GetPlan(PlanType plan);
}
