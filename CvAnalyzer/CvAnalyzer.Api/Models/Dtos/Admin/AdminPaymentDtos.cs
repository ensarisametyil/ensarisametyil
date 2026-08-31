namespace CvAnalyzer.Api.Models.Dtos.Admin;

public record AdminPaymentListItemDto(
    Guid Id, Guid UserId, string UserEmail, string Status,
    decimal? Amount, string? Currency, string? SubscriptionReference, DateTime CreatedAt, DateTime? ProcessedAt);
