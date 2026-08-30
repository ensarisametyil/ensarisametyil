namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>
/// One of the caller's own past checkout attempts. Amount/Currency (Stage 15) are the backend's
/// own catalog price recorded at checkout time — never a raw Iyzico payload or secret, and never
/// anything the client could have influenced.
/// </summary>
public record PaymentHistoryItemDto(DateTime Date, string Status, string? Provider, string? SubscriptionReference, decimal? Amount, string? Currency);
