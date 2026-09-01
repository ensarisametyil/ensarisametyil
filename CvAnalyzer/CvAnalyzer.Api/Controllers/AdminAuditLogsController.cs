using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Admin;
using CvAnalyzer.Api.RateLimiting;
using CvAnalyzer.Api.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvAnalyzer.Api.Controllers;

/// <summary>Admin-only, read-only audit trail of privileged admin actions. See AdminDashboardController's doc comment for the authorization model.</summary>
[ApiController]
[Authorize(Roles = "Admin")]
[EnableRateLimiting(RateLimitPolicies.Admin)]
[Route("api/admin/audit-logs")]
public class AdminAuditLogsController : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private readonly IAdminAuditLogService _auditLog;

    public AdminAuditLogsController(IAdminAuditLogService auditLog)
    {
        _auditLog = auditLog;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<AdminAuditLogEntryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = DefaultPageSize, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var result = await _auditLog.ListAsync(page, pageSize, cancellationToken);
        var items = result.Items.Select(l => new AdminAuditLogEntryDto(
            l.Id, l.AdminEmail, l.Action.ToString(), l.TargetEmail, l.Details, l.Success, l.CreatedAt)).ToList();

        return Ok(new PagedResultDto<AdminAuditLogEntryDto>(items, result.Page, result.PageSize, result.TotalCount));
    }
}
