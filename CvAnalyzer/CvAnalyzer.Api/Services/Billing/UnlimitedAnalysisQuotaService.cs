namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Current, accurate behavior: there is no Free/Premium plan or usage limit yet, so every
/// authenticated user can analyze as many CVs as they like. Replace the DI registration with a
/// plan-aware implementation once Plan/UsageRecord entities exist — CvController does not change.
/// </summary>
public class UnlimitedAnalysisQuotaService : IAnalysisQuotaService
{
    public Task EnsureUserCanAnalyzeAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task RecordAnalysisUsageAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
