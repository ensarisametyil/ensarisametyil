using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Admin;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Admin;
using CvAnalyzer.Api.Services.Billing.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// Admin-only user management. [Authorize(Roles = "Admin")] gates every action here at the
/// middleware layer — see AdminDashboardController's doc comment for why that's enough on its
/// own, with no per-action re-check needed. Every mutation goes through IAdminUserService, which
/// uses the exact same User entity fields/conventions AuthService already uses for a user acting
/// on their own account — never a raw SQL update from inside this controller.
/// </summary>
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private readonly IAdminUserService _adminUserService;
    private readonly IAdminAuditLogService _auditLog;
    private readonly IPaymentService _paymentService;

    public AdminUsersController(IAdminUserService adminUserService, IAdminAuditLogService auditLog, IPaymentService paymentService)
    {
        _adminUserService = adminUserService;
        _auditLog = auditLog;
        _paymentService = paymentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<AdminUserListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListUsers([FromQuery] int page = 1, [FromQuery] int pageSize = DefaultPageSize, [FromQuery] string? search = null, CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var result = await _adminUserService.ListUsersAsync(page, pageSize, search, cancellationToken);
        var items = result.Items.Select(u => new AdminUserListItemDto(u.Id, u.Email, u.Role.ToString(), u.IsActive, u.CreatedAt, u.Plan)).ToList();

        return Ok(new PagedResultDto<AdminUserListItemDto>(items, result.Page, result.PageSize, result.TotalCount));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserDetail(Guid id, CancellationToken cancellationToken)
    {
        var detail = await _adminUserService.GetUserDetailAsync(id, cancellationToken);
        if (detail is null)
        {
            return NotFound(new ErrorResponseDto("USER_NOT_FOUND", "Kullanıcı bulunamadı."));
        }

        var payments = detail.Payments
            .Select(p => new Models.Dtos.Billing.PaymentHistoryItemDto(p.Date, p.Status, p.Provider, p.SubscriptionReference, p.Amount, p.Currency))
            .ToList();

        return Ok(new AdminUserDetailDto(
            detail.Id, detail.Email, detail.CreatedAt, detail.Role.ToString(), detail.IsActive, detail.EmailVerifiedAt,
            detail.Plan, detail.SubscriptionStatus, detail.SubscriptionStartDate, detail.SubscriptionEndDate,
            detail.UsageUsed, detail.UsageLimit, detail.UsageRemaining, payments));
    }

    [HttpPatch("{id:guid}/active")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetActive(Guid id, SetUserActiveRequestDto request, CancellationToken cancellationToken)
    {
        var adminId = User.GetUserId();
        var result = await _adminUserService.SetUserActiveAsync(adminId, id, request.IsActive, cancellationToken);
        if (!result.Success)
        {
            await _auditLog.RecordAsync(adminId, request.IsActive ? Models.Entities.AdminAuditAction.UserActivated : Models.Entities.AdminAuditAction.UserDeactivated, id, result.ErrorMessage, success: false, cancellationToken);
            return BadRequest(new ErrorResponseDto("ACTION_FAILED", result.ErrorMessage ?? "İşlem başarısız oldu."));
        }

        return Ok(new { message = "Kullanıcı durumu güncellendi." });
    }

    [HttpPatch("{id:guid}/role")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetRole(Guid id, SetUserRoleRequestDto request, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role))
        {
            return BadRequest(new ErrorResponseDto("INVALID_ROLE", "Geçersiz rol."));
        }

        var adminId = User.GetUserId();
        var result = await _adminUserService.SetUserRoleAsync(adminId, id, role, cancellationToken);
        if (!result.Success)
        {
            await _auditLog.RecordAsync(adminId, Models.Entities.AdminAuditAction.UserRoleChanged, id, result.ErrorMessage, success: false, cancellationToken);
            return BadRequest(new ErrorResponseDto("ACTION_FAILED", result.ErrorMessage ?? "İşlem başarısız oldu."));
        }

        return Ok(new { message = "Kullanıcı rolü güncellendi." });
    }

    /// <summary>
    /// Cancels a user's active Premium subscription — the exact same
    /// IPaymentService.CancelPremiumSubscriptionAsync path a user's own self-service cancel button
    /// uses (see BillingController.CancelSubscription), just invoked with the target user's id
    /// instead of the caller's own. Never grants Premium; only ever downgrades, which is why this
    /// is the one subscription-management action exposed here — see docs/admin-panel.md for why a
    /// manual "grant Premium" action was deliberately left out.
    /// </summary>
    [HttpPost("{id:guid}/subscription/cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelSubscription(Guid id, CancellationToken cancellationToken)
    {
        var adminId = User.GetUserId();
        var result = await _paymentService.CancelPremiumSubscriptionAsync(id, cancellationToken);

        await _auditLog.RecordAsync(adminId, AdminAuditAction.SubscriptionCancelled, id, result.Success ? "Premium subscription cancelled" : result.ErrorMessage, result.Success, cancellationToken);

        if (!result.Success)
        {
            return BadRequest(new ErrorResponseDto("CANCELLATION_FAILED", result.ErrorMessage ?? "Abonelik iptal edilemedi."));
        }

        return Ok(new { message = "Kullanıcının aboneliği iptal edildi." });
    }
}
