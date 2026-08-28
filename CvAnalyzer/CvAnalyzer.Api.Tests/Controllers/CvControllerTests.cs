using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.Billing;
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
    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static IFormFile CreateFormFile(byte[] content, string fileName, string contentType)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName) { Headers = new HeaderDictionary(), ContentType = contentType };
    }

    private static CvController CreateController(
        AppDbContext db,
        FakeFileStorageService fileStorage,
        IAiCvAnalysisService aiService,
        Guid userId)
    {
        var controller = new CvController(
            db,
            fileStorage,
            new CvFileValidator(),
            new FileParserService(),
            new CvTextNormalizer(Options.Create(new AiOptions())),
            aiService,
            new UnlimitedAnalysisQuotaService(),
            NullLogger<CvController>.Instance);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = TestPrincipal.ForUser(userId) },
        };

        return controller;
    }

    private static Task<byte[]> ReadSamplePdfAsync() =>
        File.ReadAllBytesAsync(Path.Combine(AppContext.BaseDirectory, "TestData", "sample.pdf"));

    private static async Task<Cv> SeedCvAsync(AppDbContext db, FakeFileStorageService fileStorage, Guid ownerId, byte[] fileBytes, string fileName = "sample.pdf")
    {
        var storageKey = fileStorage.Seed(fileBytes, Path.GetExtension(fileName));
        var cv = new Cv
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            FileName = fileName,
            FilePath = storageKey,
            ContentType = "application/pdf",
            FileSizeBytes = fileBytes.Length,
            UploadedAt = DateTime.UtcNow,
        };
        db.Cvs.Add(cv);
        await db.SaveChangesAsync();
        return cv;
    }

    [Fact]
    public async Task Analyze_ValidCvId_ReturnsAnalysisResultAndPersistsAnalysis()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response);
        var analysis = Assert.IsType<CvAnalysisResult>(okResult.Value);
        Assert.Equal(82, analysis.OverallScore);

        var savedAnalysis = Assert.Single(db.Analyses);
        Assert.Equal(cv.Id, savedAnalysis.CvId);
        Assert.Equal(userId, savedAnalysis.UserId);
        Assert.Equal(82, savedAnalysis.OverallScore);
    }

    [Fact]
    public async Task Analyze_UnknownCvId_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, new FakeFileStorageService(), FakeAiCvAnalysisService.ReturningDeterministicResult(), Guid.NewGuid());

        var response = await controller.Analyze(Guid.NewGuid(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("CV_NOT_FOUND", error.Code);
    }

    [Fact]
    public async Task Analyze_AnotherUsersCv_ReturnsNotFoundAndDoesNotAnalyze()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, ownerId, await ReadSamplePdfAsync());

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), attackerId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("CV_NOT_FOUND", error.Code);
        Assert.Empty(db.Analyses);
    }

    [Fact]
    public async Task Analyze_AiProviderUnavailable_ReturnsServiceUnavailable()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());

        var failingAiService = FakeAiCvAnalysisService.Throwing(new AiProviderUnavailableException("timed out"));
        var controller = CreateController(db, fileStorage, failingAiService, userId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, statusResult.StatusCode);
        var error = Assert.IsType<ErrorResponseDto>(statusResult.Value);
        Assert.Equal("AI_UNAVAILABLE", error.Code);
        Assert.Empty(db.Analyses);
    }

    [Fact]
    public async Task Analyze_AiRateLimited_ReturnsTooManyRequests()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());

        var failingAiService = FakeAiCvAnalysisService.Throwing(new AiRateLimitExceededException("rate limited"));
        var controller = CreateController(db, fileStorage, failingAiService, userId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status429TooManyRequests, statusResult.StatusCode);
    }

    [Fact]
    public async Task Upload_ValidPdf_AssignsAuthenticatedUserAsOwner()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var samplePdfBytes = await ReadSamplePdfAsync();

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userId);
        var file = CreateFormFile(samplePdfBytes, "sample.pdf", "application/pdf");

        var response = await controller.Upload(file, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response);
        var uploadResult = Assert.IsType<CvUploadResponseDto>(okResult.Value);
        Assert.Equal("sample.pdf", uploadResult.FileName);

        var savedCv = Assert.Single(db.Cvs);
        Assert.Equal(userId, savedCv.UserId);
    }

    [Fact]
    public async Task Upload_NoFile_StillReturnsBadRequest()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, new FakeFileStorageService(), FakeAiCvAnalysisService.ReturningDeterministicResult(), Guid.NewGuid());

        var response = await controller.Upload(null, CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_FILE", error.Code);
    }

    [Fact]
    public async Task List_ReturnsOnlyCallersOwnCvs()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var bytes = await ReadSamplePdfAsync();
        var cvA = await SeedCvAsync(db, fileStorage, userA, bytes, "a.pdf");
        await SeedCvAsync(db, fileStorage, userB, bytes, "b.pdf");

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userA);

        var response = await controller.List(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response);
        var list = Assert.IsType<List<CvSummaryDto>>(okResult.Value);
        var item = Assert.Single(list);
        Assert.Equal(cvA.Id, item.Id);
    }

    [Fact]
    public async Task Get_AnotherUsersCv_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, ownerId, await ReadSamplePdfAsync());

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), attackerId);

        var response = await controller.Get(cv.Id, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("CV_NOT_FOUND", error.Code);
    }

    [Fact]
    public async Task Get_OwnCv_ReturnsDetail()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userId);

        var response = await controller.Get(cv.Id, CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(response);
        var detail = Assert.IsType<CvDetailDto>(okResult.Value);
        Assert.Equal(cv.Id, detail.Id);
    }

    [Fact]
    public async Task Delete_AnotherUsersCv_ReturnsNotFoundAndDoesNotDelete()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, ownerId, await ReadSamplePdfAsync());

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), attackerId);

        var response = await controller.Delete(cv.Id, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("CV_NOT_FOUND", error.Code);
        Assert.Single(db.Cvs);
    }

    [Fact]
    public async Task Delete_OwnCv_RemovesIt()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());

        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userId);

        var response = await controller.Delete(cv.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(response);
        Assert.Empty(db.Cvs);
    }
}
