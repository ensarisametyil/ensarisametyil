namespace CvAnalyzer.Api.Services.Billing;

public class FeatureEntitlementService : IFeatureEntitlementService
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly IPlanCatalog _planCatalog;

    public FeatureEntitlementService(ISubscriptionService subscriptionService, IPlanCatalog planCatalog)
    {
        _subscriptionService = subscriptionService;
        _planCatalog = planCatalog;
    }

    public async Task<bool> HasFeatureAsync(Guid userId, PlanFeature feature, CancellationToken cancellationToken = default)
    {
        var plan = await _subscriptionService.GetEffectivePlanAsync(userId, cancellationToken);
        return _planCatalog.GetPlan(plan).HasFeature(feature);
    }
}
