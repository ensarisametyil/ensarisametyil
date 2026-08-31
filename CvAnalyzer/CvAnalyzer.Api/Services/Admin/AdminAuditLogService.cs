using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Services.Admin;

public class AdminAuditLogService : IAdminAuditLogService
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _timeProvider;

    public AdminAuditLogService(AppDbContext db, TimeProvider timeProvider)
    {
        _db = db;
        _timeProvider = timeProvider;
    }

    public async Task RecordAsync(Guid adminUserId, AdminAuditAction action, Guid? targetUserId, string? details, bool success, CancellationToken cancellationToken = default)
    {
        _db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            AdminUserId = adminUserId,
            Action = action,
            TargetUserId = targetUserId,
            Details = details,
            Success = success,
            CreatedAt = _timeProvider.GetUtcNow().UtcDateTime,
        });

        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResultDto<AdminAuditLogEntry>> ListAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = _db.AdminAuditLogs.OrderByDescending(l => l.CreatedAt);
        var totalCount = await query.CountAsync(cancellationToken);

        // Target users can be deleted; a left join keeps the log row intact with a null email
        // rather than losing the historical record (see AdminAuditLog's doc comment).
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Users, l => l.AdminUserId, u => u.Id, (l, adminUser) => new { Log = l, AdminEmail = adminUser.Email })
            .Select(x => new AdminAuditLogEntry(
                x.Log.Id,
                x.Log.AdminUserId,
                x.AdminEmail,
                x.Log.Action,
                x.Log.TargetUserId,
                _db.Users.Where(u => u.Id == x.Log.TargetUserId).Select(u => u.Email).FirstOrDefault(),
                x.Log.Details,
                x.Log.Success,
                x.Log.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<AdminAuditLogEntry>(items, page, pageSize, totalCount);
    }
}
