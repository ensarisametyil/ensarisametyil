using CvAnalyzer.Api.Models.Dtos;

namespace CvAnalyzer.Api.Services.AI;

/// <summary>
/// Sends CV text to an AI provider and returns a structured analysis. Callers (controllers)
/// depend only on this interface — never on a specific provider's SDK — so the provider can
/// be swapped (Claude, OpenAI, Gemini, ...) without touching anything upstream.
/// </summary>
public interface IAiCvAnalysisService
{
    /// <summary>
    /// Throws <see cref="ArgumentException"/> for empty/whitespace input, and the
    /// <see cref="AiAnalysisException"/> subclasses in this namespace for every provider-side
    /// failure (missing configuration, unreachable provider, rate limiting, unparseable response).
    /// </summary>
    Task<CvAnalysisResult> AnalyzeCvAsync(string cvText, CancellationToken cancellationToken = default);
}
