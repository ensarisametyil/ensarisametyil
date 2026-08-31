namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// The set of admin actions this stage actually exposes (see AdminController) — kept in lockstep
/// with what AdminUserService/AdminController can do, not a speculative superset. Never anything
/// that reads/exposes a secret (password, API key, card data) — those are excluded from the admin
/// surface entirely (see docs/admin-panel.md), so there's nothing sensitive an action here could
/// ever need to log.
/// </summary>
public enum AdminAuditAction
{
    UserActivated,
    UserDeactivated,
    UserRoleChanged,
    SubscriptionCancelled,
}
