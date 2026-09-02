namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// Which Career Assistant feature produced a <see cref="CareerAssistantResult"/> row — see
/// docs/career-assistant.md. Kept as a single enum (rather than one entity per feature) so
/// history/versioning for all five AI-backed features shares one table (see
/// CareerAssistantResult's doc comment) instead of five near-identical ones.
/// </summary>
public enum CareerAssistantResultType
{
    JobMatch,
    AtsAnalysis,
    CvRewrite,
    CareerRecommendations,
    CoverLetter,
}
