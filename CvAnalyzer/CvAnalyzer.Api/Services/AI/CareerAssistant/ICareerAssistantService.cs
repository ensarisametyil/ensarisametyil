using CvAnalyzer.Api.Models.Dtos.CareerAssistant;

namespace CvAnalyzer.Api.Services.AI.CareerAssistant;

/// <summary>
/// Sends CV text (and, for two features, a job description) to an AI provider and returns one of
/// the five structured Career Assistant results. Callers (CareerAssistantController) depend only
/// on this interface — never on a specific provider's SDK — exactly like IAiCvAnalysisService.
/// Every method throws <see cref="ArgumentException"/> for empty/whitespace required input and
/// the <see cref="AiAnalysisException"/> subclasses (already defined for the base CV analysis
/// pipeline, reused here unchanged) for every provider-side failure.
/// </summary>
public interface ICareerAssistantService
{
    Task<JobMatchResult> AnalyzeJobMatchAsync(string cvText, string jobDescription, CancellationToken cancellationToken = default);

    Task<AtsAnalysisResult> AnalyzeAtsAsync(string cvText, CancellationToken cancellationToken = default);

    Task<CvRewriteResult> RewriteCvAsync(string cvText, CancellationToken cancellationToken = default);

    Task<CareerRecommendationsResult> RecommendCareersAsync(string cvText, CancellationToken cancellationToken = default);

    Task<CoverLetterResult> GenerateCoverLetterAsync(string cvText, string jobDescription, string targetLanguage, CancellationToken cancellationToken = default);
}
