using CvAnalyzer.Api.Models.Dtos.Billing;

namespace CvAnalyzer.Api.Models.Dtos.Admin;

public record AdminUserListItemDto(Guid Id, string Email, string Role, bool IsActive, DateTime CreatedAt, string Plan);

public record AdminUserDetailDto(
    Guid Id,
    string Email,
    DateTime CreatedAt,
    string Role,
    bool IsActive,
    DateTime? EmailVerifiedAt,
    string Plan,
    string? SubscriptionStatus,
    DateTime? SubscriptionStartDate,
    DateTime? SubscriptionEndDate,
    int UsageUsed,
    int? UsageLimit,
    int? UsageRemaining,
    List<PaymentHistoryItemDto> Payments);

/// <summary>Body of PATCH /api/admin/users/{id}/active. No other field is accepted — an admin can never smuggle a plan/role/payment change through this endpoint.</summary>
public record SetUserActiveRequestDto(bool IsActive);

/// <summary>Body of PATCH /api/admin/users/{id}/role. Role must be one of the known UserRole names — anything else is rejected, never silently coerced.</summary>
public record SetUserRoleRequestDto(string Role);
