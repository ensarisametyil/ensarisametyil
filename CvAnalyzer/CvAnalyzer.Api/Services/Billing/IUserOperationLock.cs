namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Serializes a critical section per user id, within this process. Used by
/// <see cref="AnalysisQuotaService"/> so two concurrent requests from the same user can never
/// both observe "quota available" and both consume the same last credit.
/// </summary>
public interface IUserOperationLock
{
    /// <summary>
    /// Waits for exclusive access to <paramref name="userId"/>'s critical section. Dispose the
    /// returned handle (e.g. via `using`) to release it — always release, even on exceptions.
    /// </summary>
    Task<IDisposable> AcquireAsync(Guid userId, CancellationToken cancellationToken = default);
}
