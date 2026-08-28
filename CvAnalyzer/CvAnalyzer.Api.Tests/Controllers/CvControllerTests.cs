using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Tests.TestHelpers;
using CvAnalyzer.Api.Validators;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Controllers;

public class CvControllerTests
{
    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static IFormFile CreateFormFile(byte[] content, string fileName, string contentType)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName) { Headers = new HeaderDictionary(), ContentType = contentType };
    }

    private static CvController CreateController(
        AppDbContext db,
        FakeFileStorageService fileStorage,
        IAiCvAnalysisService aiService) =>
        new(
            db,
            fileStorage,
            new CvFileValidator(),
            new FileParserService(),
            new CvTextNormalizer(Options.Create(new AiOptions())),
            aiService,
            NullLogger<CvController>.Instance);

    [Fact]
    public async Task Analyze_ValidCvId_ReturnsAnalysisResult()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var samplePdfBytes = await File.ReadAllBytesAsync(
            Path.Combine(AppContext.BaseDirectory, "TestData", "sample.pdf"));
        var storageKey = fileStorage.Seed(samplePdfBytes, ".pdf");

        var cv = new Cv
        {
            Id = Guid.NewGuid(),
            FileName = "sample.pdf",
            FilePath = storageKey,
            ContentType = "application/pdf",
            FileSizeBytes = samplePdfBytes.Length,
            UploadedAt = DateTime.UtcNow,
        };
        db.Cvs.Add(cv);
        await db.SaveChangesAsync();

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult());

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response);
        var analysis = Assert.IsType<CvAnalysisResult>(okResult.Value);
        Assert.Equal(82, analysis.OverallScore);
    }

    [Fact]
    public async Task Analyze_UnknownCvId_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, new FakeFileStorageService(), FakeAiCvAnalysisService.ReturningDeterministicResult());

        var response = await controller.Analyze(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("CV_NOT_FOUND", error.Code);
    }

    [Fact]
    public async Task Analyze_AiProviderUnavailable_ReturnsServiceUnavailable()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var samplePdfBytes = await File.ReadAllBytesAsync(
            Path.Combine(AppContext.BaseDirectory, "TestData", "sample.pdf"));
        var storageKey = fileStorage.Seed(samplePdfBytes, ".pdf");

        var cv = new Cv
        {
            Id = Guid.NewGuid(),
            FileName = "sample.pdf",
            FilePath = storageKey,
            ContentType = "application/pdf",
            FileSizeBytes = samplePdfBytes.Length,
            UploadedAt = DateTime.UtcNow,
        };
        db.Cvs.Add(cv);
        await db.SaveChangesAsync();

        var failingAiService = FakeAiCvAnalysisService.Throwing(new AiProviderUnavailableException("timed out"));
        var controller = CreateController(db, fileStorage, failingAiService);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);
        var error = Assert.IsType<ErrorResponseDto>(statusResult.Value);
        Assert.Equal("AI_UNAVAILABLE", error.Code);
    }

    [Fact]
    public async Task Analyze_AiRateLimited_ReturnsTooManyRequests()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var samplePdfBytes = await File.ReadAllBytesAsync(
            Path.Combine(AppContext.BaseDirectory, "TestData", "sample.pdf"));
        var storageKey = fileStorage.Seed(samplePdfBytes, ".pdf");

        var cv = new Cv
        {
            Id = Guid.NewGuid(),
            FileName = "sample.pdf",
            FilePath = storageKey,
            ContentType = "application/pdf",
            FileSizeBytes = samplePdfBytes.Length,
            UploadedAt = DateTime.UtcNow,
        };
        db.Cvs.Add(cv);
        await db.SaveChangesAsync();

        var failingAiService = FakeAiCvAnalysisService.Throwing(new AiRateLimitExceededException("rate limited"));
        var controller = CreateController(db, fileStorage, failingAiService);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status429TooManyRequests, statusResult.StatusCode);
    }

    [Fact]
    public async Task Upload_ValidPdf_StillWorksAndPersistsCv()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var samplePdfBytes = await File.ReadAllBytesAsync(
            Path.Combine(AppContext.BaseDirectory, "TestData", "sample.pdf"));

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult());
        var file = CreateFormFile(samplePdfBytes, "sample.pdf", "application/pdf");

        var response = await controller.Upload(file, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response);
        var uploadResult = Assert.IsType<CvUploadResponseDto>(okResult.Value);
        Assert.Equal("sample.pdf", uploadResult.FileName);
        Assert.Single(db.Cvs);
    }

    [Fact]
    public async Task Upload_NoFile_StillReturnsBadRequestAsInStage4()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, new FakeFileStorageService(), FakeAiCvAnalysisService.ReturningDeterministicResult());

        var response = await controller.Upload(null, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_FILE", error.Code);
    }
}
