namespace CvAnalyzer.Api.Services.Admin;

/// <summary>
/// Everything the Admin dashboard renders in one response. TotalRevenueUsd is summed exclusively
/// from PaymentTransaction rows with Status == Succeeded — the same rows PaymentService only ever
/// marks Succeeded after its own authoritative Iyzico verification (see PaymentService's doc
/// comments) — never from anything a client could submit; there is no client input anywhere in
/// this computation at all.
/// </summary>
public sealed record AdminDashboardStats(
    int TotalUsers,
    int ActiveUsers,
    int NewUsersLast7Days,
    int FreeUsers,
    int PremiumUsers,
    int ActiveSubscriptions,
    int SucceededPayments,
    int FailedPayments,
    int PendingPayments,
    decimal TotalRevenueUsd,
    int TotalAnalyses,
    int AnalysesLast30Days,
    IReadOnlyList<AdminPaymentListItem> RecentPayments);

public interface IAdminDashboardService
{
    Task<AdminDashboardStats> GetStatsAsync(CancellationToken cancellationToken = default);
}
