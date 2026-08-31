using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Admin;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Controllers;

/// <summary>Admin-only, read-only payment listing across all users. See AdminDashboardController's doc comment for the authorization model.</summary>
[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/payments")]
public class AdminPaymentsController : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private readonly IAdminPaymentService _adminPaymentService;

    public AdminPaymentsController(IAdminPaymentService adminPaymentService)
    {
        _adminPaymentService = adminPaymentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<AdminPaymentListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ListPayments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        PaymentTransactionStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<PaymentTransactionStatus>(status, ignoreCase: true, out var value))
            {
                return BadRequest(new ErrorResponseDto("INVALID_STATUS", "Geçersiz ödeme durumu."));
            }
            parsedStatus = value;
        }

        var result = await _adminPaymentService.ListPaymentsAsync(page, pageSize, parsedStatus, search, fromDate, toDate, cancellationToken);
        var items = result.Items.Select(p => new AdminPaymentListItemDto(
            p.Id, p.UserId, p.UserEmail, p.Status.ToString(), p.Amount, p.Currency, p.SubscriptionReference, p.CreatedAt, p.ProcessedAt)).ToList();

        return Ok(new PagedResultDto<AdminPaymentListItemDto>(items, result.Page, result.PageSize, result.TotalCount));
    }
}
