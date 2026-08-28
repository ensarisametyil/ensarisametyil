using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Billing;

public interface ISubscriptionService
{
    /// <summary>
    /// Resolves the plan a user is currently on. A user with no Subscription row, or none whose
    /// Status is Active and whose [StartDate, EndDate) window covers "now", is Free — Free is the
    /// system's default and never requires a Subscription row to exist.
    /// </summary>
    Task<PlanType> GetEffectivePlanAsync(Guid userId, CancellationToken cancellationToken = default);
}
