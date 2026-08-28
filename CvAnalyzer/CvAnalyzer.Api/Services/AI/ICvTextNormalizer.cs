namespace CvAnalyzer.Api.Services.AI;

public interface ICvTextNormalizer
{
    /// <summary>
    /// Prepares extracted CV text for the AI provider: collapses redundant whitespace and
    /// caps the length so a single oversized document can't blow up token cost. Never returns
    /// a value longer than the configured character limit.
    /// </summary>
    string Normalize(string rawText);
}
