namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>One of the caller's own past checkout attempts. Deliberately no Amount field — this app has never defined a plan price anywhere (see docs/monetization.md) — and never any raw provider payload or secret.</summary>
public record PaymentHistoryItemDto(DateTime Date, string Status, string? Provider, string? SubscriptionReference);
