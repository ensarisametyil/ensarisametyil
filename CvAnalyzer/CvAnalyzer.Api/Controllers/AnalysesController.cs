using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// Analysis history. Every query is scoped to User.GetUserId() — a caller can only ever see
/// their own analyses; an analysis id belonging to another user returns 404, identical to a
/// truly nonexistent id.
/// </summary>
[ApiController]
[Authorize]
[Route("api/analyses")]
public class AnalysesController : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private readonly AppDbContext _db;

    public AnalysesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<AnalysisSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = DefaultPageSize, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.Analyses
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AnalysisSummaryDto(a.Id, a.CvId, a.Cv.FileName, a.OverallScore, a.Summary, a.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(new PagedResultDto<AnalysisSummaryDto>(items, page, pageSize, totalCount));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AnalysisDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var analysis = await _db.Analyses
            .Where(a => a.Id == id && a.UserId == userId)
            .Select(a => new AnalysisDetailDto(
                a.Id,
                a.CvId,
                a.Cv.FileName,
                a.CreatedAt,
                new CvAnalysisResult
                {
                    OverallScore = a.OverallScore,
                    Summary = a.Summary,
                    Strengths = a.Strengths,
                    Weaknesses = a.Weaknesses,
                    Skills = a.Skills,
                    Experience = a.Experience,
                    Education = a.Education,
                    MissingKeywords = a.MissingKeywords,
                    Recommendations = a.Recommendations,
                }))
            .SingleOrDefaultAsync(cancellationToken);

        if (analysis is null)
        {
            return NotFound(new ErrorResponseDto("ANALYSIS_NOT_FOUND", "Belirtilen analiz bulunamadı."));
        }

        return Ok(analysis);
    }
}
