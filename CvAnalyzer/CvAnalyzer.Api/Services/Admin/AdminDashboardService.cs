using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Admin;

public class AdminDashboardService : IAdminDashboardService
{
    private const int RecentPaymentsCount = 5;

    private readonly AppDbContext _db;
    private readonly TimeProvider _timeProvider;

    public AdminDashboardService(AppDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task<AdminDashboardStats> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var sevenDaysAgo = now.AddDays(-7);
        var thirtyDaysAgo = now.AddDays(-30);

        var totalUsers = await _db.Users.CountAsync(cancellationToken);
        var activeUsers = await _db.Users.CountAsync(u => u.IsActive, cancellationToken);
        var newUsersLast7Days = await _db.Users.CountAsync(u => u.CreatedAt >= sevenDaysAgo, cancellationToken);

        // Same "active Premium subscription" condition as SubscriptionService.GetEffectivePlanAsync,
        // aggregated across all users rather than resolved one user at a time.
        var premiumUsers = await _db.Subscriptions
            .Where(s => s.Plan == PlanType.Premium
                        && s.Status == SubscriptionStatus.Active
                        && s.StartDate <= now
                        && (s.EndDate == null || s.EndDate > now))
            .Select(s => s.UserId)
            .Distinct()
            .CountAsync(cancellationToken);
        var freeUsers = totalUsers - premiumUsers;

        var activeSubscriptions = await _db.Subscriptions.CountAsync(s => s.Status == SubscriptionStatus.Active, cancellationToken);

        var succeededPayments = await _db.PaymentTransactions.CountAsync(t => t.Status == PaymentTransactionStatus.Succeeded, cancellationToken);
        var failedPayments = await _db.PaymentTransactions.CountAsync(t => t.Status == PaymentTransactionStatus.Failed, cancellationToken);
        var pendingPayments = await _db.PaymentTransactions.CountAsync(t => t.Status == PaymentTransactionStatus.Initiated, cancellationToken);

        // Only ever summed from verified-successful rows — see this type's doc comment.
        var totalRevenueUsd = await _db.PaymentTransactions
            .Where(t => t.Status == PaymentTransactionStatus.Succeeded)
            .SumAsync(t => t.AmountUsd ?? 0m, cancellationToken);

        var totalAnalyses = await _db.Analyses.CountAsync(cancellationToken);
        var analysesLast30Days = await _db.Analyses.CountAsync(a => a.CreatedAt >= thirtyDaysAgo, cancellationToken);

        var recentPayments = await _db.PaymentTransactions
            .OrderByDescending(t => t.CreatedAt)
            .Take(RecentPaymentsCount)
            .Select(t => new AdminPaymentListItem(
                t.Id, t.UserId, t.User.Email, t.Status,
                t.AmountUsd, t.Currency, t.ProviderSubscriptionReferenceCode, t.CreatedAt, t.ProcessedAt))
            .ToListAsync(cancellationToken);

        return new AdminDashboardStats(
            totalUsers, activeUsers, newUsersLast7Days,
            freeUsers, premiumUsers, activeSubscriptions,
            succeededPayments, failedPayments, pendingPayments,
            totalRevenueUsd,
            totalAnalyses, analysesLast30Days,
            recentPayments);
    }
}
