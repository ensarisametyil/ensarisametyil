namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// One row per privileged action an admin performs (see AdminAuditAction) — "who did what to
/// whom, when, and did it succeed". This is the persisted record the Admin panel's Audit Logs
/// screen reads from; it is deliberately separate from the app's existing ILogger-based technical
/// logging (which still runs alongside this for operational diagnostics) because that output
/// isn't queryable from the UI and isn't structured per-admin-action. Never stores a password,
/// API key, secret, or raw payment payload — Details is always a short, safe, human-readable
/// summary (e.g. "Premium -> Free"), the same discipline already used for
/// PaymentTransaction.FailureReason.
/// </summary>
public class AdminAuditLog
{
    public Guid Id { get; set; }

    /// <summary>The admin who performed the action — always resolved from the caller's own JWT, never from any request body.</summary>
    public Guid AdminUserId { get; set; }

    public AdminAuditAction Action { get; set; }

    /// <summary>The user the action was performed on, if any (null for actions with no single target).</summary>
    public Guid? TargetUserId { get; set; }

    /// <summary>Short, safe, human-readable summary of what changed — never a secret or raw payment payload.</summary>
    public string? Details { get; set; }

    public bool Success { get; set; }

    public DateTime CreatedAt { get; set; }

    public User AdminUser { get; set; } = null!;
}
