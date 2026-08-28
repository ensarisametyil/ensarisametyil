using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Billing;

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _timeProvider;

    public SubscriptionService(AppDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task<PlanType> GetEffectivePlanAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;

        var hasActivePremium = await _db.Subscriptions.AnyAsync(
            s => s.UserId == userId
                 && s.Plan == PlanType.Premium
                 && s.Status == SubscriptionStatus.Active
                 && s.StartDate <= now
                 && (s.EndDate == null || s.EndDate > now),
            cancellationToken);

        return hasActivePremium ? PlanType.Premium : PlanType.Free;
    }
}
