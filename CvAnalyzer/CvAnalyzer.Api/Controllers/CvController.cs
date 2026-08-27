using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
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

    public CvController(AppDbContext db, IFileStorageService fileStorage, ICvFileValidator fileValidator)
    {
        _db = db;
        _fileStorage = fileStorage;
        _fileValidator = fileValidator;
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
}
