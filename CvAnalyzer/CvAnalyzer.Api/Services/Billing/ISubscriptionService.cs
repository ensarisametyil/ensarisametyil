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

    /// <summary>
    /// The user's most recent Subscription row (by CreatedAt), regardless of status — null if the
    /// user has never had one (a Free user who has never checked out). Used only for the account/
    /// billing detail view (plan, status, provider, dates); never for the Free/Premium
    /// entitlement decision itself, which stays exclusively <see cref="GetEffectivePlanAsync"/>'s job.
    /// </summary>
    Task<Subscription?> GetCurrentSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default);
}
