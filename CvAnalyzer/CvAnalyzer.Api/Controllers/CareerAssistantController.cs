using System.Text.Json;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.CareerAssistant;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.RateLimiting;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.AI.CareerAssistant;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Services.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// CVora AI's Premium career-assistant features (Job Match, ATS Analyzer, CV Rewriter, Career
/// Recommendations, Cover Letter Generator), plus the always-available CVora Score and the
/// Premium CV A/B comparison — see docs/career-assistant.md.
///
/// Every action here requires authentication and every query/mutation is scoped to
/// User.GetUserId(), exactly like CvController — a caller can never see or generate results for
/// another user's CV, and a CV/result id belonging to someone else returns the same 404 as one
/// that doesn't exist at all. Every AI-backed create action additionally checks
/// IFeatureEntitlementService server-side before ever reaching the AI provider — a Free user gets
/// 403 regardless of what the frontend does or doesn't show, exactly like the file's own doc
/// comment on why this matters (see docs/admin-panel.md's identical discipline for admin routes).
/// </summary>
[ApiController]
[Authorize]
[Route("api/career-assistant")]
public class CareerAssistantController : ControllerBase
{
    private const int MaxJobDescriptionLength = 6000;

    private static readonly ErrorResponseDto CvNotFoundError = new("CV_NOT_FOUND", "Belirtilen CV bulunamadı.");
    private static readonly ErrorResponseDto ResultNotFoundError = new("CAREER_ASSISTANT_RESULT_NOT_FOUND", "Belirtilen sonuç bulunamadı.");
    private static readonly ErrorResponseDto PremiumRequiredError = new("PREMIUM_FEATURE_REQUIRED", "Bu özellik yalnızca Premium üyeler için kullanılabilir.");

    private static readonly string[] SupportedLocales = ["tr", "en", "de"];
    private static readonly Dictionary<string, string> CoverLetterLanguageNames = new()
    {
        ["tr"] = "Turkish",
        ["en"] = "English",
        ["de"] = "German",
    };

    private readonly AppDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly IFileParserService _fileParser;
    private readonly ICvTextNormalizer _textNormalizer;
    private readonly ICareerAssistantService _careerAssistantService;
    private readonly IFeatureEntitlementService _entitlements;
    private readonly ILogger<CareerAssistantController> _logger;

    public CareerAssistantController(
        AppDbContext db,
        IFileStorageService fileStorage,
        IFileParserService fileParser,
        ICvTextNormalizer textNormalizer,
        ICareerAssistantService careerAssistantService,
        IFeatureEntitlementService entitlements,
        ILogger<CareerAssistantController> logger)
    {
        _db = db;
        _fileStorage = fileStorage;
        _fileParser = fileParser;
        _textNormalizer = textNormalizer;
        _careerAssistantService = careerAssistantService;
        _entitlements = entitlements;
        _logger = logger;
    }

    [HttpPost("job-match")]
    [EnableRateLimiting(RateLimitPolicies.Analyze)]
    [ProducesResponseType(typeof(JobMatchResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> JobMatch(JobMatchRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryValidateJobDescription(request.JobDescription, out var jobDescriptionError))
        {
            return jobDescriptionError!;
        }

        var setup = await PrepareAsync(request.CvId, PlanFeature.JobDescriptionAnalysis, cancellationToken);
        if (setup.ErrorResult is not null)
        {
            return setup.ErrorResult;
        }

        return await ExecuteAiFeatureAsync(
            () => _careerAssistantService.AnalyzeJobMatchAsync(setup.CvText!, request.JobDescription.Trim(), cancellationToken),
            result => PersistAndReturnAsync(setup.Cv!.Id, CareerAssistantResultType.JobMatch, result, cancellationToken));
    }

    [HttpPost("ats-analysis")]
    [EnableRateLimiting(RateLimitPolicies.Analyze)]
    [ProducesResponseType(typeof(AtsAnalysisResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AtsAnalysis(AtsAnalysisRequestDto request, CancellationToken cancellationToken)
    {
        var setup = await PrepareAsync(request.CvId, PlanFeature.AtsAnalysis, cancellationToken);
        if (setup.ErrorResult is not null)
        {
            return setup.ErrorResult;
        }

        return await ExecuteAiFeatureAsync(
            () => _careerAssistantService.AnalyzeAtsAsync(setup.CvText!, cancellationToken),
            result => PersistAndReturnAsync(setup.Cv!.Id, CareerAssistantResultType.AtsAnalysis, result, cancellationToken));
    }

    [HttpPost("rewrite")]
    [EnableRateLimiting(RateLimitPolicies.Analyze)]
    [ProducesResponseType(typeof(CvRewriteResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Rewrite(CvRewriteRequestDto request, CancellationToken cancellationToken)
    {
        var setup = await PrepareAsync(request.CvId, PlanFeature.CvRewrite, cancellationToken);
        if (setup.ErrorResult is not null)
        {
            return setup.ErrorResult;
        }

        return await ExecuteAiFeatureAsync(
            () => _careerAssistantService.RewriteCvAsync(setup.CvText!, cancellationToken),
            result => PersistAndReturnAsync(setup.Cv!.Id, CareerAssistantResultType.CvRewrite, result, cancellationToken));
    }

    [HttpPost("career-recommendations")]
    [EnableRateLimiting(RateLimitPolicies.Analyze)]
    [ProducesResponseType(typeof(CareerRecommendationsResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CareerRecommendations(CareerRecommendationsRequestDto request, CancellationToken cancellationToken)
    {
        var setup = await PrepareAsync(request.CvId, PlanFeature.AdvancedRecommendations, cancellationToken);
        if (setup.ErrorResult is not null)
        {
            return setup.ErrorResult;
        }

        return await ExecuteAiFeatureAsync(
            () => _careerAssistantService.RecommendCareersAsync(setup.CvText!, cancellationToken),
            result => PersistAndReturnAsync(setup.Cv!.Id, CareerAssistantResultType.CareerRecommendations, result, cancellationToken));
    }

    [HttpPost("cover-letter")]
    [EnableRateLimiting(RateLimitPolicies.Analyze)]
    [ProducesResponseType(typeof(CoverLetterResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CoverLetter(CoverLetterRequestDto request, CancellationToken cancellationToken)
    {
        if (!TryValidateJobDescription(request.JobDescription, out var jobDescriptionError))
        {
            return jobDescriptionError!;
        }

        var setup = await PrepareAsync(request.CvId, PlanFeature.CoverLetterGeneration, cancellationToken);
        if (setup.ErrorResult is not null)
        {
            return setup.ErrorResult;
        }

        var locale = SupportedLocales.Contains(request.Locale) ? request.Locale! : "tr";
        var targetLanguage = CoverLetterLanguageNames[locale];

        return await ExecuteAiFeatureAsync(
            () => _careerAssistantService.GenerateCoverLetterAsync(setup.CvText!, request.JobDescription.Trim(), targetLanguage, cancellationToken),
            result => PersistAndReturnAsync(setup.Cv!.Id, CareerAssistantResultType.CoverLetter, result, cancellationToken));
    }

    /// <summary>
    /// Never feature-gated — available to every user (mirrors GET /api/billing/usage's own "read
    /// state, not a create action" reasoning). Free users get a score computed purely from their
    /// base CV analysis; a user who has also run an ATS Analysis (Premium-only to create — see
    /// AtsAnalysis above) automatically gets the ATS-blended version the next time they view this.
    /// </summary>
    [HttpGet("cvora-score/{cvId:guid}")]
    [ProducesResponseType(typeof(CvoraScoreResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CvoraScore(Guid cvId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var cvOwned = await _db.Cvs.AnyAsync(c => c.Id == cvId && c.UserId == userId, cancellationToken);
        if (!cvOwned)
        {
            return NotFound(CvNotFoundError);
        }

        var latestAnalysis = await _db.Analyses
            .Where(a => a.CvId == cvId && a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new { a.Id, a.OverallScore, a.Summary, a.Strengths, a.Weaknesses, a.Skills, a.Experience, a.Education, a.MissingKeywords, a.Recommendations })
            .FirstOrDefaultAsync(cancellationToken);

        if (latestAnalysis is null)
        {
            return NotFound(new ErrorResponseDto("ANALYSIS_NOT_FOUND", "CVora Score hesaplanabilmesi için önce bu CV'yi analiz etmelisiniz."));
        }

        var baseAnalysis = new CvAnalysisResult
        {
            OverallScore = latestAnalysis.OverallScore,
            Summary = latestAnalysis.Summary,
            Strengths = latestAnalysis.Strengths,
            Weaknesses = latestAnalysis.Weaknesses,
            Skills = latestAnalysis.Skills,
            Experience = latestAnalysis.Experience,
            Education = latestAnalysis.Education,
            MissingKeywords = latestAnalysis.MissingKeywords,
            Recommendations = latestAnalysis.Recommendations,
        };

        var latestAts = await _db.CareerAssistantResults
            .Where(r => r.CvId == cvId && r.UserId == userId && r.Type == CareerAssistantResultType.AtsAnalysis)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        AtsAnalysisResult? atsResult = latestAts is null ? null : JsonSerializer.Deserialize<AtsAnalysisResult>(latestAts.ResultJson);

        var score = CvoraScoreCalculator.Calculate(latestAnalysis.Id, baseAnalysis, latestAts?.Id, atsResult);
        return Ok(score);
    }

    /// <summary>Never feature-gated on the read path — same reasoning as AnalysesController's history endpoints (only creating a new premium result is gated, not viewing one the user already has).</summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(PagedResultDto<CareerAssistantResultSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> History([FromQuery] Guid? cvId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.CareerAssistantResults.Where(r => r.UserId == userId);
        if (cvId is not null)
        {
            query = query.Where(r => r.CvId == cvId);
        }

        var ordered = query.OrderByDescending(r => r.CreatedAt);
        var totalCount = await ordered.CountAsync(cancellationToken);

        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new CareerAssistantResultSummaryDto(r.Id, r.CvId, r.Cv.FileName, r.Type.ToString(), r.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(new PagedResultDto<CareerAssistantResultSummaryDto>(items, page, pageSize, totalCount));
    }

    [HttpGet("history/{id:guid}")]
    [ProducesResponseType(typeof(CareerAssistantResultDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> HistoryDetail(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var result = await _db.CareerAssistantResults
            .Where(r => r.Id == id && r.UserId == userId)
            .Select(r => new { r.Id, r.CvId, CvFileName = r.Cv.FileName, r.Type, r.ResultJson, r.CreatedAt })
            .SingleOrDefaultAsync(cancellationToken);

        if (result is null)
        {
            return NotFound(ResultNotFoundError);
        }

        var resultElement = JsonSerializer.Deserialize<JsonElement>(result.ResultJson);
        return Ok(new CareerAssistantResultDetailDto(result.Id, result.CvId, result.CvFileName, result.Type.ToString(), result.CreatedAt, resultElement));
    }

    /// <summary>
    /// Safe MVP for CV A/B comparison (see docs/career-assistant.md's scope note): compares two
    /// of the caller's own past base analyses using only data already on file — never a new AI
    /// call, so this can never be abused for extra AI cost and never risks the accuracy issues an
    /// AI-narrated diff would introduce.
    /// </summary>
    [HttpGet("compare")]
    [ProducesResponseType(typeof(CvComparisonResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Compare([FromQuery] Guid analysisIdA, [FromQuery] Guid analysisIdB, CancellationToken cancellationToken)
    {
        if (analysisIdA == analysisIdB)
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Karşılaştırma için iki farklı analiz belirtmelisiniz."));
        }

        var userId = User.GetUserId();
        if (!await _entitlements.HasFeatureAsync(userId, PlanFeature.CvComparison, cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, PremiumRequiredError);
        }

        var rawA = await LoadAnalysisSideAsync(analysisIdA, userId, cancellationToken);
        if (rawA is null)
        {
            return NotFound(new ErrorResponseDto("ANALYSIS_NOT_FOUND", "Belirtilen analiz bulunamadı."));
        }

        var rawB = await LoadAnalysisSideAsync(analysisIdB, userId, cancellationToken);
        if (rawB is null)
        {
            return NotFound(new ErrorResponseDto("ANALYSIS_NOT_FOUND", "Belirtilen analiz bulunamadı."));
        }

        // "Unique" means present on this side but not the other — a shared strength/weakness is
        // not a meaningful difference between the two CVs, so it's excluded from both sides.
        var sharedStrengths = new HashSet<string>(rawA.Value.Strengths.Intersect(rawB.Value.Strengths));
        var sharedWeaknesses = new HashSet<string>(rawA.Value.Weaknesses.Intersect(rawB.Value.Weaknesses));

        var analysisA = rawA.Value.ToSide(sharedStrengths, sharedWeaknesses);
        var analysisB = rawB.Value.ToSide(sharedStrengths, sharedWeaknesses);

        return Ok(new CvComparisonResultDto(analysisA, analysisB, analysisA.OverallScore - analysisB.OverallScore));
    }

    private readonly record struct RawAnalysisSide(Guid Id, Guid CvId, string CvFileName, int OverallScore, DateTime CreatedAt, List<string> Strengths, List<string> Weaknesses)
    {
        public CvComparisonSide ToSide(HashSet<string> sharedStrengths, HashSet<string> sharedWeaknesses) => new(
            Id, CvId, CvFileName, OverallScore, CreatedAt,
            Strengths.Where(s => !sharedStrengths.Contains(s)).ToList(),
            Weaknesses.Where(w => !sharedWeaknesses.Contains(w)).ToList());
    }

    private async Task<RawAnalysisSide?> LoadAnalysisSideAsync(Guid analysisId, Guid userId, CancellationToken cancellationToken)
    {
        var analysis = await _db.Analyses
            .Where(a => a.Id == analysisId && a.UserId == userId)
            .Select(a => new { a.Id, a.CvId, CvFileName = a.Cv.FileName, a.OverallScore, a.Strengths, a.Weaknesses, a.CreatedAt })
            .SingleOrDefaultAsync(cancellationToken);

        return analysis is null
            ? null
            : new RawAnalysisSide(analysis.Id, analysis.CvId, analysis.CvFileName, analysis.OverallScore, analysis.CreatedAt, analysis.Strengths, analysis.Weaknesses);
    }

    // ---------- Shared helpers ----------

    private readonly record struct PrepareResult(Cv? Cv, string? CvText, IActionResult? ErrorResult);

    /// <summary>Ownership check + entitlement check + file read/parse/normalize — the setup every AI-backed create action needs before calling the AI provider, factored out once rather than repeated five times.</summary>
    private async Task<PrepareResult> PrepareAsync(Guid cvId, PlanFeature requiredFeature, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var cv = await _db.Cvs.SingleOrDefaultAsync(c => c.Id == cvId && c.UserId == userId, cancellationToken);
        if (cv is null)
        {
            return new PrepareResult(null, null, NotFound(CvNotFoundError));
        }

        if (!await _entitlements.HasFeatureAsync(userId, requiredFeature, cancellationToken))
        {
            return new PrepareResult(null, null, StatusCode(StatusCodes.Status403Forbidden, PremiumRequiredError));
        }

        byte[] fileBytes;
        try
        {
            fileBytes = await _fileStorage.ReadAsync(cv.FilePath, cancellationToken);
        }
        catch (FileNotFoundException)
        {
            _logger.LogError("Stored file missing for Cv {CvId}.", cv.Id);
            return new PrepareResult(null, null, NotFound(new ErrorResponseDto("CV_FILE_NOT_FOUND", "CV dosyası depolama alanında bulunamadı.")));
        }

        string extractedText;
        try
        {
            extractedText = await _fileParser.ExtractTextAsync(fileBytes, cv.FileName);
        }
        catch (NotSupportedException)
        {
            return new PrepareResult(null, null, BadRequest(new ErrorResponseDto("UNSUPPORTED_FILE_TYPE", "Bu dosya türünden metin çıkarılamıyor.")));
        }
        catch (InvalidOperationException)
        {
            return new PrepareResult(null, null, BadRequest(new ErrorResponseDto("TEXT_EXTRACTION_FAILED", "CV dosyasından metin çıkarılamadı.")));
        }

        var normalizedText = _textNormalizer.Normalize(extractedText);
        if (string.IsNullOrWhiteSpace(normalizedText))
        {
            return new PrepareResult(null, null, BadRequest(new ErrorResponseDto("EMPTY_CV_TEXT", "CV içeriğinden analiz edilecek metin bulunamadı.")));
        }

        return new PrepareResult(cv, normalizedText, null);
    }

    /// <summary>Maps the same AI-pipeline exceptions CvController.Analyze already handles to the same HTTP statuses, so every Career Assistant endpoint fails the same way the base analysis endpoint does for the same underlying provider problem.</summary>
    private async Task<IActionResult> ExecuteAiFeatureAsync<T>(Func<Task<T>> aiCall, Func<T, Task<IActionResult>> onSuccess)
    {
        T result;
        try
        {
            result = await aiCall();
        }
        catch (AiConfigurationException ex)
        {
            _logger.LogError(ex, "AI analysis is not configured.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponseDto("AI_UNAVAILABLE", "AI analiz servisi şu anda kullanılamıyor."));
        }
        catch (AiRateLimitExceededException ex)
        {
            _logger.LogWarning(ex, "AI analysis rate-limited.");
            return StatusCode(StatusCodes.Status429TooManyRequests, new ErrorResponseDto("AI_RATE_LIMITED", "AI servisi şu anda yoğun, lütfen daha sonra tekrar deneyin."));
        }
        catch (AiProviderUnavailableException ex)
        {
            _logger.LogError(ex, "AI provider unavailable.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponseDto("AI_UNAVAILABLE", "AI analiz servisine şu anda ulaşılamıyor."));
        }
        catch (AiResponseParsingException ex)
        {
            _logger.LogError(ex, "AI response could not be used.");
            return StatusCode(StatusCodes.Status502BadGateway, new ErrorResponseDto("AI_INVALID_RESPONSE", "AI servisinden geçerli bir sonuç alınamadı."));
        }

        return await onSuccess(result);
    }

    private async Task<IActionResult> PersistAndReturnAsync<T>(Guid cvId, CareerAssistantResultType type, T result, CancellationToken cancellationToken)
    {
        var entity = new CareerAssistantResult
        {
            Id = Guid.NewGuid(),
            CvId = cvId,
            UserId = User.GetUserId(),
            Type = type,
            ResultJson = JsonSerializer.Serialize(result),
            CreatedAt = DateTime.UtcNow,
        };
        _db.CareerAssistantResults.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(result);
    }

    private static bool TryValidateJobDescription(string? jobDescription, out IActionResult? errorResult)
    {
        if (string.IsNullOrWhiteSpace(jobDescription))
        {
            errorResult = new BadRequestObjectResult(new ErrorResponseDto("INVALID_REQUEST", "İş ilanı metni zorunludur."));
            return false;
        }

        if (jobDescription.Length > MaxJobDescriptionLength)
        {
            errorResult = new BadRequestObjectResult(new ErrorResponseDto("JOB_DESCRIPTION_TOO_LONG", $"İş ilanı metni {MaxJobDescriptionLength} karakteri aşamaz."));
            return false;
        }

        errorResult = null;
        return true;
    }
}
