using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Services.AI;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>
/// Deterministic stand-in for <see cref="IAiCvAnalysisService"/> used across tests so nothing
/// ever calls the real Claude API (no network access, no cost) while still exercising the
/// full upstream/downstream pipeline (controller, normalization, error mapping).
/// </summary>
public class FakeAiCvAnalysisService : IAiCvAnalysisService
{
    private readonly CvAnalysisResult? _result;
    private readonly Exception? _exceptionToThrow;

    private FakeAiCvAnalysisService(CvAnalysisResult? result, Exception? exceptionToThrow)
    {
        _result = result;
        _exceptionToThrow = exceptionToThrow;
    }

    public static FakeAiCvAnalysisService ReturningDeterministicResult() => new(
        new CvAnalysisResult
        {
            OverallScore = 82,
            Summary = "Strong technical CV with clear backend experience.",
            Strengths = ["Clear structure", "Relevant hands-on experience"],
            Weaknesses = ["No quantifiable achievements"],
            Skills = ["C#", "ASP.NET Core", "PostgreSQL"],
            Experience = "3+ years as a backend developer.",
            Education = "BSc Computer Science.",
            MissingKeywords = ["Docker", "CI/CD"],
            Recommendations = ["Add measurable impact to experience bullet points."],
        },
        exceptionToThrow: null);

    public static FakeAiCvAnalysisService Throwing(Exception exception) => new(result: null, exception);

    public Task<CvAnalysisResult> AnalyzeCvAsync(string cvText, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(cvText))
        {
            throw new ArgumentException("CV text to analyze cannot be empty.", nameof(cvText));
        }

        if (_exceptionToThrow is not null)
        {
            throw _exceptionToThrow;
        }

        return Task.FromResult(_result!);
    }
}
