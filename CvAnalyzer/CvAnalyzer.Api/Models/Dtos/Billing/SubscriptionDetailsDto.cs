namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>
/// Response of GET /api/billing/subscription — richer than UsageDto's bare plan string, for the
/// account/billing page. Status/Provider/dates are null when the user has never had a
/// Subscription row (a Free user who has never checked out) — this is expected and not an error.
/// </summary>
public record SubscriptionDetailsDto(string Plan, string? Status, string? Provider, DateTime? StartDate, DateTime? EndDate, bool CanCancel);
