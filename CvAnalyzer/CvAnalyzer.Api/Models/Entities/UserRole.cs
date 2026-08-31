namespace CvAnalyzer.Api.Models.Entities;

/// <summary>
/// Minimal two-role model (Stage 16) — everything the admin panel gates on is "is this caller an
/// Admin", so nothing more granular is needed yet. Stored as a string column (see AppDbContext,
/// same convention as PlanType/SubscriptionStatus) and carried in the JWT as a "role" claim (see
/// JwtTokenService), which is what lets [Authorize(Roles = "Admin")] enforce this at the ASP.NET
/// Core middleware layer — not something any controller action re-implements by hand.
/// </summary>
public enum UserRole
{
    User,
    Admin,
}
