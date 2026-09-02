using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.CareerAssistant;
using CvAnalyzer.Api.Services.AI.CareerAssistant;

namespace CvAnalyzer.Api.Tests.Services.AI.CareerAssistant;

/// <summary>
/// CvoraScoreCalculator is a pure function — every test here gives it a concrete input and
/// asserts the exact expected output, proving the score is deterministic and that every
/// component derivation documented on the class actually behaves as documented.
/// </summary>
public class CvoraScoreCalculatorTests
{
    private static CvAnalysisResult FullAnalysis() => new()
    {
        OverallScore = 80,
        Summary = "A solid CV.",
        Strengths = ["Clear structure"],
        Weaknesses = [],
        Skills = ["C#", "SQL", "Docker", "Git", "CI/CD", "ASP.NET Core", "PostgreSQL", "REST", "Azure", "Kubernetes"], // 10 -> TargetSkillCount
        Experience = "Five years of backend development across two companies, leading a small team.", // >= 60 chars
        Education = "BSc Computer Science.",
        MissingKeywords = [],
        Recommendations = [],
    };

    [Fact]
    public void Calculate_NoAts_UsesTheNoAtsWeightsAndLeavesAtsCompatibilityNull()
    {
        var analysisId = Guid.NewGuid();

        var score = CvoraScoreCalculator.Calculate(analysisId, FullAnalysis(), atsAnalysisId: null, atsAnalysis: null);

        Assert.Null(score.Components.AtsCompatibility);
        Assert.Null(score.BasedOnAtsAnalysisId);
        Assert.Equal(analysisId, score.BasedOnAnalysisId);
        // contentQuality=80, skills=100 (10/10), experience=100 (long summary), structure=100 (all 4 sections present), readability=100 (0 weaknesses)
        // 80*0.35 + 100*0.20 + 100*0.20 + 100*0.125 + 100*0.125 = 28 + 20 + 20 + 12.5 + 12.5 = 93
        Assert.Equal(100, score.Components.Skills);
        Assert.Equal(100, score.Components.Experience);
        Assert.Equal(100, score.Components.Structure);
        Assert.Equal(100, score.Components.Readability);
        Assert.Equal(80, score.Components.ContentQuality);
        Assert.Equal(93, score.CvoraScore);
    }

    [Fact]
    public void Calculate_WithAts_BlendsInTheAtsScoreAndReturnsItsId()
    {
        var analysisId = Guid.NewGuid();
        var atsId = Guid.NewGuid();
        var ats = new AtsAnalysisResult { AtsScore = 60, StructureScore = 60, KeywordUsageScore = 60, FormattingScore = 60, ReadabilityScore = 60 };

        var score = CvoraScoreCalculator.Calculate(analysisId, FullAnalysis(), atsId, ats);

        Assert.Equal(60, score.Components.AtsCompatibility);
        Assert.Equal(atsId, score.BasedOnAtsAnalysisId);
        // 80*0.25 + 100*0.15 + 100*0.15 + 100*0.10 + 100*0.10 + 60*0.25 = 20 + 15 + 15 + 10 + 10 + 15 = 85
        Assert.Equal(85, score.CvoraScore);
    }

    [Fact]
    public void Calculate_EmptyAnalysis_EveryComponentIsAtItsFloor()
    {
        var emptyAnalysis = new CvAnalysisResult { OverallScore = 0, Summary = "", Strengths = [], Weaknesses = [], Skills = [], Experience = "", Education = "", MissingKeywords = [], Recommendations = [] };

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), emptyAnalysis, null, null);

        Assert.Equal(0, score.Components.ContentQuality);
        Assert.Equal(0, score.Components.Skills);
        Assert.Equal(0, score.Components.Experience);
        Assert.Equal(0, score.Components.Structure);
        Assert.Equal(100, score.Components.Readability); // zero flagged weaknesses -> nothing to penalize
        // Only the readability weight (0.125) contributes: 100*0.125 = 12.5 -> rounds to 12.
        Assert.Equal(12, score.CvoraScore);
    }

    [Fact]
    public void Calculate_SkillsBeyondTargetCount_CapsAtMaximum()
    {
        var analysis = FullAnalysis() with { Skills = Enumerable.Range(0, 25).Select(i => $"Skill{i}").ToList() };

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), analysis, null, null);

        Assert.Equal(100, score.Components.Skills);
    }

    [Fact]
    public void Calculate_ShortExperienceSummary_ScoresPartialNotFull()
    {
        var analysis = FullAnalysis() with { Experience = "Backend dev." }; // well under the 60-char substantive threshold

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), analysis, null, null);

        Assert.Equal(60, score.Components.Experience);
    }

    [Fact]
    public void Calculate_MissingASection_ReducesStructureScore()
    {
        var analysis = FullAnalysis() with { Education = "" }; // 3 of 4 sections present

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), analysis, null, null);

        Assert.Equal(75, score.Components.Structure);
    }

    [Fact]
    public void Calculate_FlaggedWeaknesses_ReducesReadabilityScore()
    {
        var analysis = FullAnalysis() with { Weaknesses = ["No metrics", "Inconsistent dates", "Too long"] };

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), analysis, null, null);

        Assert.Equal(70, score.Components.Readability); // 100 - 3*10
    }

    [Fact]
    public void Calculate_ManyFlaggedWeaknesses_ReadabilityNeverGoesNegative()
    {
        var analysis = FullAnalysis() with { Weaknesses = Enumerable.Repeat("issue", 20).ToList() };

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), analysis, null, null);

        Assert.Equal(0, score.Components.Readability);
    }

    [Fact]
    public void Calculate_OutOfRangeOverallScore_IsClampedIntoContentQuality()
    {
        // A defensively-clamped input (CvAnalysisResponseParser already clamps 0-100 upstream,
        // but the calculator must not trust that blindly either).
        var analysis = FullAnalysis() with { OverallScore = 150 };

        var score = CvoraScoreCalculator.Calculate(Guid.NewGuid(), analysis, null, null);

        Assert.Equal(100, score.Components.ContentQuality);
    }
}
