namespace CvAnalyzer.Api.Models.Dtos.Admin;

public record AdminDashboardStatsDto(
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
    List<AdminPaymentListItemDto> RecentPayments);
