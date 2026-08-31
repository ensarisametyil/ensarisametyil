using CvAnalyzer.Api.Models.Dtos.Admin;
using CvAnalyzer.Api.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// Admin-only. [Authorize(Roles = "Admin")] is enforced by ASP.NET Core's authentication/
/// authorization middleware (see Program.cs's RoleClaimType binding) before this controller's
/// code ever runs — a caller without a valid "Admin" role claim gets 401/403 at the framework
/// layer, not from any check written here. Every query is read-only aggregate data; nothing here
/// accepts or trusts any client-supplied figure (see AdminDashboardStats's doc comment on revenue).
/// </summary>
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/dashboard")]
public class AdminDashboardController : ControllerBase
{
    private readonly IAdminDashboardService _dashboardService;

    public AdminDashboardController(IAdminDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminDashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        var stats = await _dashboardService.GetStatsAsync(cancellationToken);

        return Ok(new AdminDashboardStatsDto(
            stats.TotalUsers, stats.ActiveUsers, stats.NewUsersLast7Days,
            stats.FreeUsers, stats.PremiumUsers, stats.ActiveSubscriptions,
            stats.SucceededPayments, stats.FailedPayments, stats.PendingPayments,
            stats.TotalRevenueUsd,
            stats.TotalAnalyses, stats.AnalysesLast30Days,
            stats.RecentPayments.Select(ToDto).ToList()));
    }

    private static AdminPaymentListItemDto ToDto(AdminPaymentListItem p) =>
        new(p.Id, p.UserId, p.UserEmail, p.Status.ToString(), p.Amount, p.Currency, p.SubscriptionReference, p.CreatedAt, p.ProcessedAt);
}
