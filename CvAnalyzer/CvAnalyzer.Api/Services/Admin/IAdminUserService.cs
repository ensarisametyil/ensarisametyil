using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing.Payments;

namespace CvAnalyzer.Api.Services.Admin;

/// <summary>One row of the Users list — the minimum an admin needs to scan/search the list, not the full detail view.</summary>
public sealed record AdminUserListItem(Guid Id, string Email, UserRole Role, bool IsActive, DateTime CreatedAt, string Plan);

/// <summary>
/// Full detail for one user — account, subscription, usage, and payment history, composed from
/// the existing per-user services (ISubscriptionService, IAnalysisQuotaService, IPaymentService)
/// exactly as those services already expose to the user themselves; this only widens who is
/// allowed to ask (an Admin, about someone else) via AdminController's authorization, not what
/// data is computed or how.
/// </summary>
public sealed record AdminUserDetail(
    Guid Id,
    string Email,
    DateTime CreatedAt,
    UserRole Role,
    bool IsActive,
    DateTime? EmailVerifiedAt,
    string Plan,
    string? SubscriptionStatus,
    DateTime? SubscriptionStartDate,
    DateTime? SubscriptionEndDate,
    int UsageUsed,
    int? UsageLimit,
    int? UsageRemaining,
    IReadOnlyList<PaymentTransactionSummary> Payments);

public sealed record AdminUserActionResult(bool Success, string? ErrorMessage);

/// <summary>
/// Read/manage surface for the Admin panel's Users screens. Every mutating method here goes
/// through the same User entity / existing conventions AuthService already uses (e.g. IsActive,
/// UpdatedAt) — never a raw SQL update, and never anything AuthService/SubscriptionService/
/// PaymentService doesn't already do for a user acting on their own account.
/// </summary>
public interface IAdminUserService
{
    Task<PagedResultDto<AdminUserListItem>> ListUsersAsync(int page, int pageSize, string? search, CancellationToken cancellationToken = default);

    Task<AdminUserDetail?> GetUserDetailAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Activates/deactivates a user's account (same IsActive flag AuthService.DeactivateAccountAsync sets for self-service). An admin may never target their own account this way — refuses with a failure result instead.</summary>
    Task<AdminUserActionResult> SetUserActiveAsync(Guid actingAdminId, Guid targetUserId, bool isActive, CancellationToken cancellationToken = default);

    /// <summary>Changes a user's role. An admin may never change their own role this way — refuses with a failure result instead (prevents an admin accidentally locking themselves out or leaving zero admins).</summary>
    Task<AdminUserActionResult> SetUserRoleAsync(Guid actingAdminId, Guid targetUserId, UserRole role, CancellationToken cancellationToken = default);
}
