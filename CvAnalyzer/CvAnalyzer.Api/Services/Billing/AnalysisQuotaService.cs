using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Real quota enforcement: User -&gt; effective Plan (ISubscriptionService) -&gt; PlanDefinition
/// (IPlanCatalog) -&gt; this month's usage count (AnalysisUsage) -&gt; allow/deny. See
/// IUserOperationLock for how RecordAnalysisUsageAsync stays race-safe under concurrent requests.
/// </summary>
public class AnalysisQuotaService : IAnalysisQuotaService
{
    private readonly AppDbContext _db;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IPlanCatalog _planCatalog;
    private readonly IUserOperationLock _userLock;
    private readonly TimeProvider _timeProvider;

    public AnalysisQuotaService(
        AppDbContext db,
        ISubscriptionService subscriptionService,
        IPlanCatalog planCatalog,
        IUserOperationLock userLock,
        TimeProvider timeProvider)
    {
        _db = db;
        _subscriptionService = subscriptionService;
        _planCatalog = planCatalog;
        _userLock = userLock;
        _timeProvider = timeProvider;
    }

    public async Task EnsureUserCanAnalyzeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var definition = await ResolvePlanDefinitionAsync(userId, cancellationToken);
        if (definition.MonthlyAnalysisLimit is null)
        {
            return;
        }

        var (periodStart, _) = GetCurrentPeriod();
        var used = await CountUsageAsync(userId, periodStart, cancellationToken);

        if (used >= definition.MonthlyAnalysisLimit.Value)
        {
            throw QuotaExceeded(definition.MonthlyAnalysisLimit.Value);
        }
    }

    public async Task RecordAnalysisUsageAsync(Guid userId, Guid analysisId, CancellationToken cancellationToken = default)
    {
        // Everything below must run for exactly one caller at a time per user — otherwise two
        // concurrent requests could both read "1 of 2 used" and both proceed to insert a usage
        // row, over-spending the last credit. This lock is what actually prevents that; the
        // pre-check in EnsureUserCanAnalyzeAsync is not atomic and is not relied on for this.
        using (await _userLock.AcquireAsync(userId, cancellationToken))
        {
            var definition = await ResolvePlanDefinitionAsync(userId, cancellationToken);
            var (periodStart, periodEnd) = GetCurrentPeriod();

            if (definition.MonthlyAnalysisLimit is not null)
            {
                var used = await CountUsageAsync(userId, periodStart, cancellationToken);
                if (used >= definition.MonthlyAnalysisLimit.Value)
                {
                    throw QuotaExceeded(definition.MonthlyAnalysisLimit.Value);
                }
            }

            _db.AnalysisUsages.Add(new AnalysisUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AnalysisId = analysisId,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                CreatedAt = _timeProvider.GetUtcNow().UtcDateTime,
            });

            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<AnalysisUsageSummary> GetUsageSummaryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var plan = await _subscriptionService.GetEffectivePlanAsync(userId, cancellationToken);
        var definition = _planCatalog.GetPlan(plan);
        var (periodStart, periodEnd) = GetCurrentPeriod();
        var used = await CountUsageAsync(userId, periodStart, cancellationToken);

        var remaining = definition.MonthlyAnalysisLimit is null
            ? (int?)null
            : Math.Max(0, definition.MonthlyAnalysisLimit.Value - used);

        return new AnalysisUsageSummary(plan, used, definition.MonthlyAnalysisLimit, remaining, periodStart, periodEnd);
    }

    private async Task<PlanDefinition> ResolvePlanDefinitionAsync(Guid userId, CancellationToken cancellationToken)
    {
        var plan = await _subscriptionService.GetEffectivePlanAsync(userId, cancellationToken);
        return _planCatalog.GetPlan(plan);
    }

    private Task<int> CountUsageAsync(Guid userId, DateTime periodStart, CancellationToken cancellationToken) =>
        _db.AnalysisUsages.CountAsync(u => u.UserId == userId && u.PeriodStart == periodStart, cancellationToken);

    private (DateTime PeriodStart, DateTime PeriodEnd) GetCurrentPeriod()
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return (start, start.AddMonths(1));
    }

    private static AnalysisQuotaExceededException QuotaExceeded(int limit) =>
        new($"Aylık analiz hakkınızı doldurdunuz ({limit} analiz). Daha fazla analiz için Premium'a geçebilirsiniz.");
}
