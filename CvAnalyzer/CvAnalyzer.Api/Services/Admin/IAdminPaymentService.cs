using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Admin;

/// <summary>One PaymentTransaction row, across all users — the admin-facing projection (adds the owning user's email; never a raw provider payload or secret, same discipline as PaymentService.GetPaymentHistoryAsync).</summary>
public sealed record AdminPaymentListItem(
    Guid Id, Guid UserId, string UserEmail, PaymentTransactionStatus Status,
    decimal? Amount, string? Currency, string? SubscriptionReference, DateTime CreatedAt, DateTime? ProcessedAt);

/// <summary>
/// Read-only, cross-user listing of PaymentTransaction rows for the Admin panel's Payments
/// screen. Deliberately read-only — there is no method here that mutates a payment; the payment
/// lifecycle stays exclusively IPaymentService's job (Iyzico-verified), never something an admin
/// can set by hand.
/// </summary>
public interface IAdminPaymentService
{
    Task<PagedResultDto<AdminPaymentListItem>> ListPaymentsAsync(
        int page, int pageSize, PaymentTransactionStatus? status, string? search, DateTime? fromDate, DateTime? toDate,
        CancellationToken cancellationToken = default);
}
