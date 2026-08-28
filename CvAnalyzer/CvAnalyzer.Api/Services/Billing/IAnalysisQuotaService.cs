namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Seam for the Free/Premium plan and usage-limit system planned for a later stage. CvController
/// calls this around every analysis so that plugging in real quota enforcement later (backed by
/// a Plan/UsageRecord schema) never requires touching the controller again — only swapping the
/// DI registration for a real implementation. The current implementation is not a stub pretending
/// to enforce limits that don't exist yet; it's an honest statement that no limits exist yet.
/// </summary>
public interface IAnalysisQuotaService
{
    /// <summary>Throws <see cref="AnalysisQuotaExceededException"/> if the user isn't allowed to run another analysis right now.</summary>
    Task EnsureUserCanAnalyzeAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Called once an analysis has actually completed successfully, to record the usage.</summary>
    Task RecordAnalysisUsageAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class AnalysisQuotaExceededException : Exception
{
    public AnalysisQuotaExceededException(string message) : base(message)
    {
    }
}
