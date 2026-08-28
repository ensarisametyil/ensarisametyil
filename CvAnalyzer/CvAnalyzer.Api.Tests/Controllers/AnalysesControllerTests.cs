using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Controllers;

public class AnalysesControllerTests
{
    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static AnalysesController CreateController(AppDbContext db, Guid userId)
    {
        var controller = new AnalysesController(db);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = TestPrincipal.ForUser(userId) },
        };
        return controller;
    }

    private static async Task<(Cv Cv, Analysis Analysis)> SeedAnalysisAsync(AppDbContext db, Guid ownerId, int score = 70, string fileName = "cv.pdf")
    {
        var cv = new Cv
        {
            Id = Guid.NewGuid(),
            UserId = ownerId,
            FileName = fileName,
            FilePath = $"{Guid.NewGuid():N}.pdf",
            ContentType = "application/pdf",
            FileSizeBytes = 100,
            UploadedAt = DateTime.UtcNow,
        };
        db.Cvs.Add(cv);

        var analysis = new Analysis
        {
            Id = Guid.NewGuid(),
            CvId = cv.Id,
            UserId = ownerId,
            OverallScore = score,
            Summary = "Test summary",
            Strengths = ["Strength 1"],
            Weaknesses = ["Weakness 1"],
            Skills = ["C#"],
            Experience = "Some experience",
            Education = "Some education",
            MissingKeywords = ["Docker"],
            Recommendations = ["Recommendation 1"],
            CreatedAt = DateTime.UtcNow,
        };
        db.Analyses.Add(analysis);

        await db.SaveChangesAsync();
        return (cv, analysis);
    }

    [Fact]
    public async Task List_ReturnsOnlyCallersOwnAnalysesNewestFirst()
    {
        using var db = CreateDbContext();
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var (_, olderAnalysis) = await SeedAnalysisAsync(db, userA, score: 60);
        await Task.Delay(5); // ensure a distinct, later CreatedAt for ordering
        var (_, newerAnalysis) = await SeedAnalysisAsync(db, userA, score: 90);
        await SeedAnalysisAsync(db, userB, score: 75);

        var controller = CreateController(db, userA);

        var response = await controller.List(page: 1, pageSize: 20, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var page = Assert.IsType<PagedResultDto<AnalysisSummaryDto>>(ok.Value);
        Assert.Equal(2, page.TotalCount);
        Assert.Equal(2, page.Items.Count);
        Assert.Equal(newerAnalysis.Id, page.Items[0].Id);
        Assert.Equal(olderAnalysis.Id, page.Items[1].Id);
    }

    [Fact]
    public async Task Get_OwnAnalysis_ReturnsDetailWithFullResult()
    {
        using var db = CreateDbContext();
        var userId = Guid.NewGuid();
        var (cv, analysis) = await SeedAnalysisAsync(db, userId);

        var controller = CreateController(db, userId);

        var response = await controller.Get(analysis.Id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var detail = Assert.IsType<AnalysisDetailDto>(ok.Value);
        Assert.Equal(analysis.Id, detail.Id);
        Assert.Equal(cv.Id, detail.CvId);
        Assert.Equal(cv.FileName, detail.CvFileName);
        Assert.Equal(analysis.OverallScore, detail.Result.OverallScore);
        Assert.Equal(analysis.Summary, detail.Result.Summary);
        Assert.Equal(analysis.Skills, detail.Result.Skills);
    }

    [Fact]
    public async Task Get_AnotherUsersAnalysis_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var (_, analysis) = await SeedAnalysisAsync(db, ownerId);

        var controller = CreateController(db, attackerId);

        var response = await controller.Get(analysis.Id, CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(notFound.Value);
        Assert.Equal("ANALYSIS_NOT_FOUND", error.Code);
    }

    [Fact]
    public async Task Get_UnknownAnalysisId_ReturnsNotFound()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, Guid.NewGuid());

        var response = await controller.Get(Guid.NewGuid(), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(response);
    }
}
