using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Filters;

/// <summary>
/// Registered globally (see Program.cs) so every controller gets it automatically, with no risk
/// of a future controller forgetting to opt in. Closes a real gap in the JWT model: this app has
/// no server-side token revocation, so a still-unexpired JWT issued before a user deactivated
/// their own account (or is deactivated by any future admin path) would otherwise keep working
/// for every request until it naturally expires. This filter re-checks User.IsActive on every
/// authenticated request and rejects with 401 the moment it is false — the closest this
/// architecture gets to revocation without adding a token blacklist/session store.
///
/// A no-op for anonymous requests (unauthenticated calls to an [AllowAnonymous] endpoint never
/// reach the DB query below) — only a request that already carries a validated JWT pays the extra
/// lookup.
/// </summary>
public class ActiveAccountFilter : IAsyncAuthorizationFilter
{
    private readonly AppDbContext _db;

    public ActiveAccountFilter(AppDbContext db)
    {
        _db = db;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        Guid userId;
        try
        {
            userId = context.HttpContext.User.GetUserId();
        }
        catch (InvalidOperationException)
        {
            // Malformed/missing sub claim — not this filter's concern (the endpoint's own
            // [Authorize]/claim reads will already fail this request appropriately).
            return;
        }

        var isActive = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => (bool?)u.IsActive)
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        if (isActive != true)
        {
            context.Result = new Microsoft.AspNetCore.Mvc.UnauthorizedResult();
        }
    }
}
