using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>
/// A quota service that never blocks and never tracks usage — for tests that exercise
/// CvController behavior unrelated to quota enforcement (upload, list, get, delete, and the
/// non-quota parts of analyze). Quota/usage logic itself is tested against the real
/// AnalysisQuotaService in Services/Billing/AnalysisQuotaServiceTests.cs.
/// </summary>
public class FakeAnalysisQuotaService : IAnalysisQuotaService
{
    public Task EnsureUserCanAnalyzeAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task RecordAnalysisUsageAsync(Guid userId, Guid analysisId, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task<AnalysisUsageSummary> GetUsageSummaryAsync(Guid userId, CancellationToken cancellationToken = default) =>
        Task.FromResult(new AnalysisUsageSummary(PlanType.Free, 0, null, null, DateTime.UtcNow, DateTime.UtcNow.AddMonths(1)));
}
