using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Admin;

/// <summary>One row of the Admin panel's Audit Logs screen — always resolved from AdminAuditLog plus the admin/target users' emails, never a raw secret.</summary>
public sealed record AdminAuditLogEntry(
    Guid Id, Guid AdminUserId, string AdminEmail, AdminAuditAction Action,
    Guid? TargetUserId, string? TargetEmail, string? Details, bool Success, DateTime CreatedAt);

/// <summary>
/// Persists and reads AdminAuditLog rows — the record of "who did what to whom" for every
/// privileged admin action (see AdminAuditAction). AdminUserService/AdminController call
/// RecordAsync after every mutating action, success or failure, so the audit trail is complete
/// even for a rejected attempt.
/// </summary>
public interface IAdminAuditLogService
{
    Task RecordAsync(Guid adminUserId, AdminAuditAction action, Guid? targetUserId, string? details, bool success, CancellationToken cancellationToken = default);

    Task<PagedResultDto<AdminAuditLogEntry>> ListAsync(int page, int pageSize, CancellationToken cancellationToken = default);
}
