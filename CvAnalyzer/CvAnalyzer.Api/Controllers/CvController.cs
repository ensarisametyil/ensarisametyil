using System.Text.Json;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Services.Storage;
using CvAnalyzer.Api.Validators;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// Every action here requires authentication and every query/mutation is scoped to
/// User.GetUserId() — a caller can never see, analyze, or delete another user's CV. A CV that
/// exists but belongs to someone else returns the same 404 as a CV that doesn't exist at all,
/// so a guessed id can't be used to learn anything about another account's data.
/// </summary>
[ApiController]
[Authorize]
[Route("api/cv")]
public class CvController : ControllerBase
{
    private static readonly ErrorResponseDto CvNotFoundError = new("CV_NOT_FOUND", "Belirtilen CV bulunamadı.");

    private readonly AppDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly ICvFileValidator _fileValidator;
    private readonly IFileParserService _fileParser;
    private readonly ICvTextNormalizer _textNormalizer;
    private readonly IAiCvAnalysisService _aiAnalysisService;
    private readonly IAnalysisQuotaService _quotaService;
    private readonly ILogger<CvController> _logger;

    public CvController(
        AppDbContext db,
        IFileStorageService fileStorage,
        ICvFileValidator fileValidator,
        IFileParserService fileParser,
        ICvTextNormalizer textNormalizer,
        IAiCvAnalysisService aiAnalysisService,
        IAnalysisQuotaService quotaService,
        ILogger<CvController> logger)
    {
        _db = db;
        _fileStorage = fileStorage;
        _fileValidator = fileValidator;
        _fileParser = fileParser;
        _textNormalizer = textNormalizer;
        _aiAnalysisService = aiAnalysisService;
        _quotaService = quotaService;
        _logger = logger;
    }

    [HttpPost("upload")]
    [ProducesResponseType(typeof(CvUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status413PayloadTooLarge)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new ErrorResponseDto("INVALID_FILE", "Yüklenecek bir dosya seçmelisiniz."));
        }

        if (file.Length > CvUploadPolicy.MaxFileSizeBytes)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge,
                new ErrorResponseDto("FILE_TOO_LARGE", "Dosya boyutu 10 MB sınırını aşıyor."));
        }

        var validation = _fileValidator.Validate(file);
        if (!validation.IsValid)
        {
            return BadRequest(new ErrorResponseDto("INVALID_FILE", validation.ErrorMessage!));
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        string storageKey;
        await using (var stream = file.OpenReadStream())
        {
            storageKey = await _fileStorage.SaveAsync(stream, extension, cancellationToken);
        }

        var cv = new Cv
        {
            Id = Guid.NewGuid(),
            // Always the authenticated caller — the client never gets to choose an owner.
            UserId = User.GetUserId(),
            FileName = Path.GetFileName(file.FileName),
            FilePath = storageKey,
            ContentType = file.ContentType,
            FileSizeBytes = file.Length,
            UploadedAt = DateTime.UtcNow
        };

        _db.Cvs.Add(cv);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new CvUploadResponseDto(cv.Id, cv.FileName));
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<CvSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var cvs = await _db.Cvs
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UploadedAt)
            .Select(c => new CvSummaryDto(c.Id, c.FileName, c.UploadedAt))
            .ToListAsync(cancellationToken);

        return Ok(cvs);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(CvDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var cv = await _db.Cvs.SingleOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken);
        if (cv is null)
        {
            return NotFound(CvNotFoundError);
        }

        return Ok(new CvDetailDto(cv.Id, cv.FileName, cv.ContentType, cv.FileSizeBytes, cv.UploadedAt));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var cv = await _db.Cvs.SingleOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken);
        if (cv is null)
        {
            return NotFound(CvNotFoundError);
        }

        // Analyses referencing this Cv cascade-delete at the database level (see AppDbContext).
        _db.Cvs.Remove(cv);
        await _db.SaveChangesAsync(cancellationToken);

        await _fileStorage.DeleteAsync(cv.FilePath, cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/analyze")]
    [ProducesResponseType(typeof(CvAnalysisResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Analyze(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var cv = await _db.Cvs.SingleOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken);
        if (cv is null)
        {
            return NotFound(CvNotFoundError);
        }

        try
        {
            await _quotaService.EnsureUserCanAnalyzeAsync(userId, cancellationToken);
        }
        catch (AnalysisQuotaExceededException ex)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new ErrorResponseDto("QUOTA_EXCEEDED", ex.Message));
        }

        byte[] fileBytes;
        try
        {
            fileBytes = await _fileStorage.ReadAsync(cv.FilePath, cancellationToken);
        }
        catch (FileNotFoundException)
        {
            _logger.LogError("Stored file missing for Cv {CvId}.", cv.Id);
            return NotFound(new ErrorResponseDto("CV_FILE_NOT_FOUND", "CV dosyası depolama alanında bulunamadı."));
        }

        string extractedText;
        try
        {
            extractedText = await _fileParser.ExtractTextAsync(fileBytes, cv.FileName);
        }
        catch (NotSupportedException)
        {
            return BadRequest(new ErrorResponseDto("UNSUPPORTED_FILE_TYPE", "Bu dosya türünden metin çıkarılamıyor."));
        }
        catch (InvalidOperationException)
        {
            return BadRequest(new ErrorResponseDto("TEXT_EXTRACTION_FAILED", "CV dosyasından metin çıkarılamadı."));
        }

        var normalizedText = _textNormalizer.Normalize(extractedText);
        if (string.IsNullOrWhiteSpace(normalizedText))
        {
            return BadRequest(new ErrorResponseDto("EMPTY_CV_TEXT", "CV içeriğinden analiz edilecek metin bulunamadı."));
        }

        CvAnalysisResult result;
        try
        {
            result = await _aiAnalysisService.AnalyzeCvAsync(normalizedText, cancellationToken);
        }
        catch (AiConfigurationException ex)
        {
            _logger.LogError(ex, "AI analysis is not configured.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new ErrorResponseDto("AI_UNAVAILABLE", "AI analiz servisi şu anda kullanılamıyor."));
        }
        catch (AiRateLimitExceededException ex)
        {
            _logger.LogWarning(ex, "AI analysis rate-limited for Cv {CvId}.", cv.Id);
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new ErrorResponseDto("AI_RATE_LIMITED", "AI servisi şu anda yoğun, lütfen daha sonra tekrar deneyin."));
        }
        catch (AiProviderUnavailableException ex)
        {
            _logger.LogError(ex, "AI provider unavailable for Cv {CvId}.", cv.Id);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new ErrorResponseDto("AI_UNAVAILABLE", "AI analiz servisine şu anda ulaşılamıyor."));
        }
        catch (AiResponseParsingException ex)
        {
            _logger.LogError(ex, "AI response could not be used for Cv {CvId}.", cv.Id);
            return StatusCode(StatusCodes.Status502BadGateway,
                new ErrorResponseDto("AI_INVALID_RESPONSE", "AI servisinden geçerli bir analiz sonucu alınamadı."));
        }

        var analysis = new Analysis
        {
            Id = Guid.NewGuid(),
            CvId = cv.Id,
            UserId = userId,
            OverallScore = result.OverallScore,
            Summary = result.Summary,
            Strengths = result.Strengths,
            Weaknesses = result.Weaknesses,
            Skills = result.Skills,
            Experience = result.Experience,
            Education = result.Education,
            MissingKeywords = result.MissingKeywords,
            Recommendations = result.Recommendations,
            RawAiResponse = JsonSerializer.Serialize(result),
            CreatedAt = DateTime.UtcNow,
        };
        _db.Analyses.Add(analysis);
        await _db.SaveChangesAsync(cancellationToken);

        await _quotaService.RecordAnalysisUsageAsync(userId, cancellationToken);

        return Ok(result);
    }
}
