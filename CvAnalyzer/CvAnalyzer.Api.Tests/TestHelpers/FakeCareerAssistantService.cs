using CvAnalyzer.Api.Models.Dtos.CareerAssistant;
using CvAnalyzer.Api.Services.AI.CareerAssistant;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Deterministic stand-in for <see cref="ICareerAssistantService"/> — mirrors FakeAiCvAnalysisService's role for the base CV analysis, so CareerAssistantController tests never call the real Claude API.</summary>
public class FakeCareerAssistantService : ICareerAssistantService
{
    public Exception? ExceptionToThrow { get; set; }

    public int CallCount { get; private set; }

    public JobMatchResult JobMatchResult { get; set; } = new()
    {
        OverallScore = 82,
        SkillsScore = 88,
        ExperienceScore = 76,
        KeywordsScore = 91,
        EducationScore = 80,
        Summary = "Strong match.",
        RequiredSkills = ["C#"],
        MatchedSkills = ["C#"],
        Strengths = ["Relevant experience"],
    };

    public AtsAnalysisResult AtsAnalysisResult { get; set; } = new()
    {
        AtsScore = 87,
        StructureScore = 90,
        KeywordUsageScore = 85,
        FormattingScore = 88,
        ReadabilityScore = 84,
        Summary = "Mostly ATS-friendly.",
        Strengths = ["Clear sections"],
    };

    public CvRewriteResult CvRewriteResult { get; set; } = new()
    {
        Summary = "A few phrasing improvements.",
        Suggestions = [new CvRewriteSuggestion { Section = "experience", Original = "Made a website.", Improved = "Built and shipped a customer-facing web application.", Reason = "More specific." }],
    };

    public CareerRecommendationsResult CareerRecommendationsResult { get; set; } = new()
    {
        Summary = "Backend-leaning profile.",
        Recommendations = [new CareerRecommendation { Role = "Junior Backend Developer", MatchPercentage = 85, Reasoning = "C# experience." }],
    };

    public CoverLetterResult CoverLetterResult { get; set; } = new() { CoverLetterText = "Dear Hiring Manager, ..." };

    public Task<JobMatchResult> AnalyzeJobMatchAsync(string cvText, string jobDescription, CancellationToken cancellationToken = default)
    {
        CallCount++;
        if (ExceptionToThrow is not null) throw ExceptionToThrow;
        return Task.FromResult(JobMatchResult);
    }

    public Task<AtsAnalysisResult> AnalyzeAtsAsync(string cvText, CancellationToken cancellationToken = default)
    {
        CallCount++;
        if (ExceptionToThrow is not null) throw ExceptionToThrow;
        return Task.FromResult(AtsAnalysisResult);
    }

    public Task<CvRewriteResult> RewriteCvAsync(string cvText, CancellationToken cancellationToken = default)
    {
        CallCount++;
        if (ExceptionToThrow is not null) throw ExceptionToThrow;
        return Task.FromResult(CvRewriteResult);
    }

    public Task<CareerRecommendationsResult> RecommendCareersAsync(string cvText, CancellationToken cancellationToken = default)
    {
        CallCount++;
        if (ExceptionToThrow is not null) throw ExceptionToThrow;
        return Task.FromResult(CareerRecommendationsResult);
    }

    public Task<CoverLetterResult> GenerateCoverLetterAsync(string cvText, string jobDescription, string targetLanguage, CancellationToken cancellationToken = default)
    {
        CallCount++;
        if (ExceptionToThrow is not null) throw ExceptionToThrow;
        return Task.FromResult(CoverLetterResult);
    }
}
