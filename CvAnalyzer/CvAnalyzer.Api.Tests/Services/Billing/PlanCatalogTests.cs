using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.Billing;

public class PlanCatalogTests
{
    [Fact]
    public void GetPlan_Free_UsesConfiguredMonthlyLimit()
    {
        var sut = new PlanCatalog(Options.Create(new PlanOptions { FreeMonthlyAnalysisLimit = 2 }));

        var plan = sut.GetPlan(PlanType.Free);

        Assert.Equal(PlanType.Free, plan.Plan);
        Assert.Equal(2, plan.MonthlyAnalysisLimit);
    }

    [Fact]
    public void GetPlan_PremiumWithNullConfiguredLimit_IsUnlimited()
    {
        var sut = new PlanCatalog(Options.Create(new PlanOptions { PremiumMonthlyAnalysisLimit = null }));

        var plan = sut.GetPlan(PlanType.Premium);

        Assert.Null(plan.MonthlyAnalysisLimit);
    }

    [Fact]
    public void GetPlan_PremiumWithConfiguredNumericLimit_UsesIt()
    {
        var sut = new PlanCatalog(Options.Create(new PlanOptions { PremiumMonthlyAnalysisLimit = 100 }));

        var plan = sut.GetPlan(PlanType.Premium);

        Assert.Equal(100, plan.MonthlyAnalysisLimit);
    }

    [Fact]
    public void GetPlan_Free_HasNoPremiumFeatures()
    {
        var sut = new PlanCatalog(Options.Create(new PlanOptions()));

        var plan = sut.GetPlan(PlanType.Free);

        Assert.False(plan.HasFeature(PlanFeature.AtsAnalysis));
        Assert.False(plan.HasFeature(PlanFeature.CvRewrite));
        Assert.Empty(plan.Features);
    }

    [Fact]
    public void GetPlan_Premium_HasAllInfrastructureReadyFeatures()
    {
        var sut = new PlanCatalog(Options.Create(new PlanOptions()));

        var plan = sut.GetPlan(PlanType.Premium);

        Assert.True(plan.HasFeature(PlanFeature.AtsAnalysis));
        Assert.True(plan.HasFeature(PlanFeature.JobDescriptionAnalysis));
        Assert.True(plan.HasFeature(PlanFeature.CvRewrite));
        Assert.True(plan.HasFeature(PlanFeature.AdvancedRecommendations));
    }
}
