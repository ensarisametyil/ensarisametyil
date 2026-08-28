using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos.Billing;
using CvAnalyzer.Api.Services.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// Everything here is scoped to the authenticated caller — userId always comes from the JWT
/// (User.GetUserId()), never from a request parameter, so a caller can only ever see their own
/// plan/usage. There is no endpoint here (or anywhere) that lets a client set its own plan.
/// </summary>
[ApiController]
[Authorize]
[Route("api/billing")]
public class BillingController : ControllerBase
{
    private readonly IAnalysisQuotaService _quotaService;

    public BillingController(IAnalysisQuotaService quotaService)
    {
        _quotaService = quotaService;
    }

    [HttpGet("usage")]
    [ProducesResponseType(typeof(UsageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsage(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var summary = await _quotaService.GetUsageSummaryAsync(userId, cancellationToken);

        return Ok(new UsageDto(
            summary.Plan.ToString().ToUpperInvariant(),
            summary.Used,
            summary.Limit,
            summary.Remaining,
            summary.PeriodStart,
            summary.PeriodEnd));
    }
}
