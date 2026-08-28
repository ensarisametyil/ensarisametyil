namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Seam for the Free/Premium plan and usage-limit system. CvController calls this around every
/// analysis, so the plan/quota model can keep evolving (e.g. Stage 9's real Iyzico-backed
/// subscriptions) without CvController changing again — only the DI registration and this
/// service's internals would move.
/// </summary>
public interface IAnalysisQuotaService
{
    /// <summary>
    /// Cheap, non-atomic pre-check called BEFORE the (costly) AI call. Throws
    /// <see cref="AnalysisQuotaExceededException"/> if the user has no quota left as of right
    /// now — this is what stops an AI provider call from ever being made once quota is already
    /// exhausted. It is intentionally not the source of race-condition safety (that's
    /// <see cref="RecordAnalysisUsageAsync"/>); this only avoids the common-case wasted AI cost.
    /// </summary>
    Task EnsureUserCanAnalyzeAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Atomically claims one usage credit for a successfully completed analysis and records it
    /// against <paramref name="analysisId"/>. Race-safe: if two requests for the same user reach
    /// this concurrently with exactly one credit left, only one call succeeds — the other throws
    /// <see cref="AnalysisQuotaExceededException"/> even though its AI call already succeeded
    /// (the caller is expected to discard that analysis in that case — see CvController.Analyze).
    /// </summary>
    Task RecordAnalysisUsageAsync(Guid userId, Guid analysisId, CancellationToken cancellationToken = default);

    /// <summary>Current plan + usage summary for GET /api/billing/usage. Never trusts client input — userId always comes from the JWT.</summary>
    Task<AnalysisUsageSummary> GetUsageSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class AnalysisQuotaExceededException : Exception
{
    public AnalysisQuotaExceededException(string message) : base(message)
    {
    }
}
