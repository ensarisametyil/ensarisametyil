namespace CvAnalyzer.Api.Services.Billing;

/// <summary>
/// Central place to ask "can this user use feature X" once a Premium-only feature (ATS analysis,
/// job-description matching, CV rewrite, ...) actually gets an endpoint. None of those endpoints
/// exist yet — this interface exists so building one later is just
/// `if (!await _entitlements.HasFeatureAsync(userId, PlanFeature.AtsAnalysis)) return Forbid();`
/// rather than a new ad hoc plan check invented per endpoint.
/// </summary>
public interface IFeatureEntitlementService
{
    Task<bool> HasFeatureAsync(Guid userId, PlanFeature feature, CancellationToken cancellationToken = default);
}
