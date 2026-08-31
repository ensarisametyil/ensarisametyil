using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Admin;

public class AdminUserService : IAdminUserService
{
    private readonly AppDbContext _db;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IAnalysisQuotaService _quotaService;
    private readonly IPaymentService _paymentService;
    private readonly IAdminAuditLogService _auditLog;
    private readonly TimeProvider _timeProvider;

    public AdminUserService(
        AppDbContext db,
        ISubscriptionService subscriptionService,
        IAnalysisQuotaService quotaService,
        IPaymentService paymentService,
        IAdminAuditLogService auditLog,
        TimeProvider timeProvider)
    {
        _db = db;
        _subscriptionService = subscriptionService;
        _quotaService = quotaService;
        _paymentService = paymentService;
        _auditLog = auditLog;
        _timeProvider = timeProvider;
    }

    public async Task<PagedResultDto<AdminUserListItem>> ListUsersAsync(int page, int pageSize, string? search, CancellationToken cancellationToken = default)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Email is always stored normalized/lowercased (see User.Email's doc comment), so a
            // plain lowercase Contains is enough — no need for a case-insensitive collation/ILike.
            var normalizedSearch = search.Trim().ToLowerInvariant();
            query = query.Where(u => u.Email.Contains(normalizedSearch));
        }

        query = query.OrderByDescending(u => u.CreatedAt);
        var totalCount = await query.CountAsync(cancellationToken);

        var pageUsers = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new { u.Id, u.Email, u.Role, u.IsActive, u.CreatedAt })
            .ToListAsync(cancellationToken);

        // One extra query for the whole page (never N+1) to resolve each row's effective plan,
        // using the exact same "active Premium subscription" condition as
        // SubscriptionService.GetEffectivePlanAsync.
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var pageUserIds = pageUsers.Select(u => u.Id).ToList();
        var premiumUserIds = await _db.Subscriptions
            .Where(s => pageUserIds.Contains(s.UserId)
                        && s.Plan == PlanType.Premium
                        && s.Status == SubscriptionStatus.Active
                        && s.StartDate <= now
                        && (s.EndDate == null || s.EndDate > now))
            .Select(s => s.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var premiumUserIdSet = premiumUserIds.ToHashSet();

        var items = pageUsers
            .Select(u => new AdminUserListItem(
                u.Id, u.Email, u.Role, u.IsActive, u.CreatedAt,
                premiumUserIdSet.Contains(u.Id) ? PlanType.Premium.ToString() : PlanType.Free.ToString()))
            .ToList();

        return new PagedResultDto<AdminUserListItem>(items, page, pageSize, totalCount);
    }

    public async Task<AdminUserDetail?> GetUserDetailAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var plan = await _subscriptionService.GetEffectivePlanAsync(userId, cancellationToken);
        var subscription = await _subscriptionService.GetCurrentSubscriptionAsync(userId, cancellationToken);
        var usage = await _quotaService.GetUsageSummaryAsync(userId, cancellationToken);
        var payments = await _paymentService.GetPaymentHistoryAsync(userId, cancellationToken);

        return new AdminUserDetail(
            user.Id,
            user.Email,
            user.CreatedAt,
            user.Role,
            user.IsActive,
            user.EmailVerifiedAt,
            plan.ToString(),
            subscription?.Status.ToString(),
            subscription?.StartDate,
            subscription?.EndDate,
            usage.Used,
            usage.Limit,
            usage.Remaining,
            payments);
    }

    public async Task<AdminUserActionResult> SetUserActiveAsync(Guid actingAdminId, Guid targetUserId, bool isActive, CancellationToken cancellationToken = default)
    {
        if (actingAdminId == targetUserId)
        {
            return new AdminUserActionResult(false, "Kendi hesabınızın durumunu bu ekrandan değiştiremezsiniz.");
        }

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);
        if (user is null)
        {
            return new AdminUserActionResult(false, "Kullanıcı bulunamadı.");
        }

        user.IsActive = isActive;
        user.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);

        await _auditLog.RecordAsync(
            actingAdminId,
            isActive ? AdminAuditAction.UserActivated : AdminAuditAction.UserDeactivated,
            targetUserId,
            $"IsActive -> {isActive}",
            success: true,
            cancellationToken);

        return new AdminUserActionResult(true, null);
    }

    public async Task<AdminUserActionResult> SetUserRoleAsync(Guid actingAdminId, Guid targetUserId, UserRole role, CancellationToken cancellationToken = default)
    {
        if (actingAdminId == targetUserId)
        {
            return new AdminUserActionResult(false, "Kendi rolünüzü bu ekrandan değiştiremezsiniz.");
        }

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);
        if (user is null)
        {
            return new AdminUserActionResult(false, "Kullanıcı bulunamadı.");
        }

        var previousRole = user.Role;
        user.Role = role;
        user.UpdatedAt = _timeProvider.GetUtcNow().UtcDateTime;
        await _db.SaveChangesAsync(cancellationToken);

        await _auditLog.RecordAsync(
            actingAdminId,
            AdminAuditAction.UserRoleChanged,
            targetUserId,
            $"{previousRole} -> {role}",
            success: true,
            cancellationToken);

        return new AdminUserActionResult(true, null);
    }
}
