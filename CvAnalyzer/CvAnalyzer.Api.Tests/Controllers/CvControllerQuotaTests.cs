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

/// <summary>
/// Exercises CvController.Analyze wired to the REAL AnalysisQuotaService (as opposed to
/// CvControllerTests.cs, which uses FakeAnalysisQuotaService to keep unrelated tests focused).
/// This is where "quota blocks before the AI call", "usage only consumed on success", and
/// "the persisted Analysis matches the consumed credit" are actually verified end to end.
/// </summary>
public class CvControllerQuotaTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 15, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTime CurrentPeriodStart = new(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime CurrentPeriodEnd = new(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static CvController CreateController(AppDbContext db, FakeFileStorageService fileStorage, IAiCvAnalysisService aiService, Guid userId, int freeLimit = 2)
    {
        var quotaService = new AnalysisQuotaService(
            db,
            new SubscriptionService(db, new FakeTimeProvider(Now)),
            new PlanCatalog(Options.Create(new PlanOptions { FreeMonthlyAnalysisLimit = freeLimit })),
            new UserOperationLock(),
            new FakeTimeProvider(Now));

        var controller = new CvController(
            db,
            fileStorage,
            new CvFileValidator(),
            new FileParserService(),
            new CvTextNormalizer(Options.Create(new AiOptions())),
            aiService,
            quotaService,
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

    private static async Task SeedUsageAsync(AppDbContext db, Guid userId, int count)
    {
        for (var i = 0; i < count; i++)
        {
            db.AnalysisUsages.Add(new AnalysisUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AnalysisId = Guid.NewGuid(),
                PeriodStart = CurrentPeriodStart,
                PeriodEnd = CurrentPeriodEnd,
                CreatedAt = CurrentPeriodStart,
            });
        }

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Analyze_UnderQuota_SucceedsAndPersistsAnalysisAndUsage()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
        Assert.Single(db.Analyses);
        Assert.Single(db.AnalysisUsages);
        Assert.Equal(db.Analyses.Single().Id, db.AnalysisUsages.Single().AnalysisId);
    }

    [Fact]
    public async Task Analyze_QuotaAlreadyExhausted_ReturnsPaymentRequiredAndNeverCallsAiProvider()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        await SeedUsageAsync(db, userId, count: 2); // free limit is 2 -> already exhausted
        var aiService = FakeAiCvAnalysisService.ReturningDeterministicResult();
        var controller = CreateController(db, fileStorage, aiService, userId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status402PaymentRequired, statusResult.StatusCode);
        var error = Assert.IsType<ErrorResponseDto>(statusResult.Value);
        Assert.Equal("QUOTA_EXCEEDED", error.Code);
        Assert.Equal(0, aiService.CallCount);
        Assert.Empty(db.Analyses);
    }

    [Fact]
    public async Task Analyze_AiProviderFails_DoesNotConsumeUsage()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var failingAi = FakeAiCvAnalysisService.Throwing(new AiProviderUnavailableException("timed out"));
        var controller = CreateController(db, fileStorage, failingAi, userId);

        var response = await controller.Analyze(cv.Id, CancellationToken.None);

        Assert.IsType<ObjectResult>(response);
        Assert.Empty(db.AnalysisUsages);
        Assert.Empty(db.Analyses);
    }

    [Fact]
    public async Task Analyze_SuccessfulAnalysis_LeavesExactlyOneCreditRemaining()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        await SeedUsageAsync(db, userId, count: 1); // 1 of 2 used
        var controller = CreateController(db, fileStorage, FakeAiCvAnalysisService.ReturningDeterministicResult(), userId);

        var firstResponse = await controller.Analyze(cv.Id, CancellationToken.None);
        Assert.IsType<OkObjectResult>(firstResponse);

        var secondResponse = await controller.Analyze(cv.Id, CancellationToken.None);
        var statusResult = Assert.IsType<ObjectResult>(secondResponse);
        Assert.Equal(StatusCodes.Status402PaymentRequired, statusResult.StatusCode);
    }
}
