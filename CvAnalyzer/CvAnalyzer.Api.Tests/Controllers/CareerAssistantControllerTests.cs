using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.CareerAssistant;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Controllers;

public class CareerAssistantControllerTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 2, 12, 0, 0, TimeSpan.Zero);

    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static (CareerAssistantController Controller, FakeCareerAssistantService AiService) CreateController(
        AppDbContext db, FakeFileStorageService fileStorage, Guid userId)
    {
        var aiService = new FakeCareerAssistantService();
        var entitlements = new FeatureEntitlementService(
            new SubscriptionService(db, new FakeTimeProvider(Now)),
            new PlanCatalog(Options.Create(new PlanOptions())));

        var controller = new CareerAssistantController(
            db,
            fileStorage,
            new FileParserService(),
            new CvTextNormalizer(Options.Create(new AiOptions())),
            aiService,
            entitlements,
            NullLogger<CareerAssistantController>.Instance);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = TestPrincipal.ForUser(userId) },
        };

        return (controller, aiService);
    }

    private static async Task MakePremiumAsync(AppDbContext db, Guid userId)
    {
        db.Subscriptions.Add(new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Plan = PlanType.Premium,
            Status = SubscriptionStatus.Active,
            StartDate = Now.UtcDateTime.AddDays(-10),
            EndDate = null,
            CreatedAt = Now.UtcDateTime,
            UpdatedAt = Now.UtcDateTime,
        });
        await db.SaveChangesAsync();
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

    private static async Task<Analysis> SeedAnalysisAsync(AppDbContext db, Guid userId, Guid cvId, int overallScore = 75, List<string>? strengths = null, List<string>? weaknesses = null)
    {
        var analysis = new Analysis
        {
            Id = Guid.NewGuid(),
            CvId = cvId,
            UserId = userId,
            OverallScore = overallScore,
            Summary = "A CV.",
            Strengths = strengths ?? ["Clear structure"],
            Weaknesses = weaknesses ?? [],
            Skills = ["C#"],
            Experience = "Some experience.",
            Education = "Some education.",
            MissingKeywords = [],
            Recommendations = [],
            CreatedAt = DateTime.UtcNow,
        };
        db.Analyses.Add(analysis);
        await db.SaveChangesAsync();
        return analysis;
    }

    // ---------- Job Match ----------

    [Fact]
    public async Task JobMatch_PremiumUserOwnCv_ReturnsResultAndPersistsHistory()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId);

        var response = await controller.JobMatch(new JobMatchRequestDto(cv.Id, "We need a backend developer with C# experience."), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var result = Assert.IsType<JobMatchResult>(ok.Value);
        Assert.Equal(82, result.OverallScore);
        Assert.Equal(1, aiService.CallCount);

        var saved = Assert.Single(db.CareerAssistantResults);
        Assert.Equal(CareerAssistantResultType.JobMatch, saved.Type);
        Assert.Equal(userId, saved.UserId);
        Assert.Equal(cv.Id, saved.CvId);
    }

    [Fact]
    public async Task JobMatch_FreeUser_ReturnsForbiddenWithoutCallingAi()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId); // no Premium subscription seeded

        var response = await controller.JobMatch(new JobMatchRequestDto(cv.Id, "We need a backend developer."), CancellationToken.None);

        var forbidden = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status403Forbidden, forbidden.StatusCode);
        var error = Assert.IsType<ErrorResponseDto>(forbidden.Value);
        Assert.Equal("PREMIUM_FEATURE_REQUIRED", error.Code);
        Assert.Equal(0, aiService.CallCount); // never reached the AI provider
        Assert.Empty(db.CareerAssistantResults);
    }

    [Fact]
    public async Task JobMatch_AnotherUsersCv_ReturnsNotFoundEvenForAPremiumCaller()
    {
        // IDOR: a Premium user must not be able to run Job Match against a CV they don't own,
        // even though they'd otherwise be entitled to the feature.
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        await MakePremiumAsync(db, attackerId);
        var victimsCv = await SeedCvAsync(db, fileStorage, ownerId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, attackerId);

        var response = await controller.JobMatch(new JobMatchRequestDto(victimsCv.Id, "job description"), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("CV_NOT_FOUND", error.Code);
        Assert.Equal(0, aiService.CallCount);
    }

    [Fact]
    public async Task JobMatch_EmptyJobDescription_ReturnsBadRequestWithoutCallingAi()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId);

        var response = await controller.JobMatch(new JobMatchRequestDto(cv.Id, "   "), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_REQUEST", error.Code);
        Assert.Equal(0, aiService.CallCount);
    }

    [Fact]
    public async Task JobMatch_JobDescriptionExceedsMaxLength_ReturnsBadRequest()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId);
        var tooLong = new string('a', 6001);

        var response = await controller.JobMatch(new JobMatchRequestDto(cv.Id, tooLong), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("JOB_DESCRIPTION_TOO_LONG", error.Code);
        Assert.Equal(0, aiService.CallCount);
    }

    [Fact]
    public async Task JobMatch_AiRateLimited_ReturnsTooManyRequests()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId);
        aiService.ExceptionToThrow = new AiRateLimitExceededException("rate limited");

        var response = await controller.JobMatch(new JobMatchRequestDto(cv.Id, "job description"), CancellationToken.None);

        var result = Assert.IsType<ObjectResult>(response);
        Assert.Equal(StatusCodes.Status429TooManyRequests, result.StatusCode);
        Assert.Empty(db.CareerAssistantResults); // failed AI call never persists a result
    }

    [Fact]
    public async Task JobMatch_NeverTouchesTheBaseAnalysisQuotaTable()
    {
        // Career Assistant features are Premium-gated by entitlement, not metered by the base
        // analysis quota counter — this proves the two systems stay fully independent.
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        await controller.JobMatch(new JobMatchRequestDto(cv.Id, "job description"), CancellationToken.None);

        Assert.Empty(db.AnalysisUsages);
    }

    // ---------- ATS Analysis ----------

    [Fact]
    public async Task AtsAnalysis_PremiumUser_ReturnsResultAndPersists()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.AtsAnalysis(new AtsAnalysisRequestDto(cv.Id), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var result = Assert.IsType<AtsAnalysisResult>(ok.Value);
        Assert.Equal(87, result.AtsScore);
        Assert.Single(db.CareerAssistantResults);
    }

    [Fact]
    public async Task AtsAnalysis_FreeUser_ReturnsForbidden()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId);

        var response = await controller.AtsAnalysis(new AtsAnalysisRequestDto(cv.Id), CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(response).StatusCode);
        Assert.Equal(0, aiService.CallCount);
    }

    // ---------- Rewrite ----------

    [Fact]
    public async Task Rewrite_PremiumUser_ReturnsResultAndPersists()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.Rewrite(new CvRewriteRequestDto(cv.Id), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        Assert.IsType<CvRewriteResult>(ok.Value);
        Assert.Single(db.CareerAssistantResults);
    }

    // ---------- Career Recommendations ----------

    [Fact]
    public async Task CareerRecommendations_PremiumUser_ReturnsResultAndPersists()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.CareerRecommendations(new CareerRecommendationsRequestDto(cv.Id), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        Assert.IsType<CareerRecommendationsResult>(ok.Value);
        Assert.Single(db.CareerAssistantResults);
    }

    // ---------- Cover Letter ----------

    [Fact]
    public async Task CoverLetter_PremiumUser_ReturnsResultAndPersists()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.CoverLetter(new CoverLetterRequestDto(cv.Id, "job description", "en"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var result = Assert.IsType<CoverLetterResult>(ok.Value);
        Assert.StartsWith("Dear Hiring Manager", result.CoverLetterText);
        Assert.Single(db.CareerAssistantResults);
    }

    [Fact]
    public async Task CoverLetter_FreeUser_ReturnsForbidden()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, aiService) = CreateController(db, fileStorage, userId);

        var response = await controller.CoverLetter(new CoverLetterRequestDto(cv.Id, "job description", "en"), CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(response).StatusCode);
        Assert.Equal(0, aiService.CallCount);
    }

    [Fact]
    public async Task CoverLetter_EmptyJobDescription_ReturnsBadRequest()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.CoverLetter(new CoverLetterRequestDto(cv.Id, "", "en"), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(response);
    }

    // ---------- CVora Score ----------

    [Fact]
    public async Task CvoraScore_NoAnalysisYet_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.CvoraScore(cv.Id, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("ANALYSIS_NOT_FOUND", error.Code);
    }

    [Fact]
    public async Task CvoraScore_AvailableToFreeUsersWithAnAnalysisOnFile_ReturnsScoreWithoutAts()
    {
        // CVora Score is not feature-gated — Free users get the basic (no-ATS) version.
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        await SeedAnalysisAsync(db, userId, cv.Id, overallScore: 75);
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.CvoraScore(cv.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var score = Assert.IsType<CvoraScoreResult>(ok.Value);
        Assert.Null(score.Components.AtsCompatibility);
        Assert.Equal(75, score.Components.ContentQuality);
    }

    [Fact]
    public async Task CvoraScore_WithAtsResultOnFile_BlendsInTheAtsScore()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        await SeedAnalysisAsync(db, userId, cv.Id);
        var (controller, _) = CreateController(db, fileStorage, userId);
        await controller.AtsAnalysis(new AtsAnalysisRequestDto(cv.Id), CancellationToken.None); // AtsScore = 87 (FakeCareerAssistantService default)

        var response = await controller.CvoraScore(cv.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var score = Assert.IsType<CvoraScoreResult>(ok.Value);
        Assert.Equal(87, score.Components.AtsCompatibility);
        Assert.NotNull(score.BasedOnAtsAnalysisId);
    }

    [Fact]
    public async Task CvoraScore_AnotherUsersCv_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, ownerId, await ReadSamplePdfAsync());
        await SeedAnalysisAsync(db, ownerId, cv.Id);
        var (controller, _) = CreateController(db, fileStorage, attackerId);

        var response = await controller.CvoraScore(cv.Id, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(response);
    }

    // ---------- History ----------

    [Fact]
    public async Task History_OnlyReturnsTheCallersOwnResults()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        await MakePremiumAsync(db, otherUserId);
        var myCv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var otherCv = await SeedCvAsync(db, fileStorage, otherUserId, await ReadSamplePdfAsync(), "other.pdf");

        var (myController, _) = CreateController(db, fileStorage, userId);
        await myController.AtsAnalysis(new AtsAnalysisRequestDto(myCv.Id), CancellationToken.None);

        var (otherController, _) = CreateController(db, fileStorage, otherUserId);
        await otherController.AtsAnalysis(new AtsAnalysisRequestDto(otherCv.Id), CancellationToken.None);

        var response = await myController.History(cvId: null, page: 1, pageSize: 20, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var page = Assert.IsType<PagedResultDto<CareerAssistantResultSummaryDto>>(ok.Value);
        var item = Assert.Single(page.Items);
        Assert.Equal(myCv.Id, item.CvId);
    }

    [Fact]
    public async Task HistoryDetail_AnotherUsersResult_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        await MakePremiumAsync(db, ownerId);
        var cv = await SeedCvAsync(db, fileStorage, ownerId, await ReadSamplePdfAsync());
        var (ownerController, _) = CreateController(db, fileStorage, ownerId);
        await ownerController.AtsAnalysis(new AtsAnalysisRequestDto(cv.Id), CancellationToken.None);
        var resultId = Assert.Single(db.CareerAssistantResults).Id;

        var (attackerController, _) = CreateController(db, fileStorage, attackerId);
        var response = await attackerController.HistoryDetail(resultId, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(response);
    }

    [Fact]
    public async Task HistoryDetail_OwnResult_ReturnsTypedResult()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var (controller, _) = CreateController(db, fileStorage, userId);
        await controller.AtsAnalysis(new AtsAnalysisRequestDto(cv.Id), CancellationToken.None);
        var resultId = Assert.Single(db.CareerAssistantResults).Id;

        var response = await controller.HistoryDetail(resultId, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var detail = Assert.IsType<CareerAssistantResultDetailDto>(ok.Value);
        Assert.Equal("AtsAnalysis", detail.Type);
        Assert.Equal(87, detail.Result.GetProperty("atsScore").GetInt32());
    }

    // ---------- Compare ----------

    [Fact]
    public async Task Compare_PremiumUserOwnAnalyses_ReturnsScoreDifferenceAndUniqueItems()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cvA = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync(), "a.pdf");
        var cvB = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync(), "b.pdf");
        var analysisA = await SeedAnalysisAsync(db, userId, cvA.Id, overallScore: 82, strengths: ["Strong C#", "Clear layout"]);
        var analysisB = await SeedAnalysisAsync(db, userId, cvB.Id, overallScore: 91, strengths: ["Strong C#", "Good metrics"]);
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.Compare(analysisA.Id, analysisB.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var comparison = Assert.IsType<CvComparisonResultDto>(ok.Value);
        Assert.Equal(82 - 91, comparison.ScoreDifference);
        Assert.Contains("Clear layout", comparison.A.UniqueStrengths);
        Assert.DoesNotContain("Strong C#", comparison.A.UniqueStrengths); // shared strength, not unique to A
        Assert.Contains("Good metrics", comparison.B.UniqueStrengths);
    }

    [Fact]
    public async Task Compare_SameAnalysisIdTwice_ReturnsBadRequest()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var analysis = await SeedAnalysisAsync(db, userId, cv.Id);
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.Compare(analysis.Id, analysis.Id, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(response);
    }

    [Fact]
    public async Task Compare_FreeUser_ReturnsForbidden()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var cv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var analysisA = await SeedAnalysisAsync(db, userId, cv.Id);
        var analysisB = await SeedAnalysisAsync(db, userId, cv.Id);
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.Compare(analysisA.Id, analysisB.Id, CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(response).StatusCode);
    }

    [Fact]
    public async Task Compare_OneAnalysisBelongsToAnotherUser_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var fileStorage = new FakeFileStorageService();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        await MakePremiumAsync(db, userId);
        var myCv = await SeedCvAsync(db, fileStorage, userId, await ReadSamplePdfAsync());
        var othersCv = await SeedCvAsync(db, fileStorage, otherUserId, await ReadSamplePdfAsync(), "other.pdf");
        var myAnalysis = await SeedAnalysisAsync(db, userId, myCv.Id);
        var othersAnalysis = await SeedAnalysisAsync(db, otherUserId, othersCv.Id);
        var (controller, _) = CreateController(db, fileStorage, userId);

        var response = await controller.Compare(myAnalysis.Id, othersAnalysis.Id, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("ANALYSIS_NOT_FOUND", error.Code);
    }
}
