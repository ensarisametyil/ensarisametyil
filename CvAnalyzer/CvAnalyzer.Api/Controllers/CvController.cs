using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Services.Storage;
using CvAnalyzer.Api.Validators;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Controllers;

[ApiController]
[Route("api/cv")]
public class CvController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _fileStorage;
    private readonly ICvFileValidator _fileValidator;
    private readonly IFileParserService _fileParser;
    private readonly ICvTextNormalizer _textNormalizer;
    private readonly IAiCvAnalysisService _aiAnalysisService;
    private readonly ILogger<CvController> _logger;

    public CvController(
        AppDbContext db,
        IFileStorageService fileStorage,
        ICvFileValidator fileValidator,
        IFileParserService fileParser,
        ICvTextNormalizer textNormalizer,
        IAiCvAnalysisService aiAnalysisService,
        ILogger<CvController> logger)
    {
        _db = db;
        _fileStorage = fileStorage;
        _fileValidator = fileValidator;
        _fileParser = fileParser;
        _textNormalizer = textNormalizer;
        _aiAnalysisService = aiAnalysisService;
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
            UserId = null,
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

    [HttpPost("{id:guid}/analyze")]
    [ProducesResponseType(typeof(CvAnalysisResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status502BadGateway)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Analyze(Guid id, CancellationToken cancellationToken)
    {
        var cv = await _db.Cvs.FindAsync(new object?[] { id }, cancellationToken);
        if (cv is null)
        {
            return NotFound(new ErrorResponseDto("CV_NOT_FOUND", "Belirtilen CV bulunamadı."));
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

        try
        {
            var result = await _aiAnalysisService.AnalyzeCvAsync(normalizedText, cancellationToken);
            return Ok(result);
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
    }
}
