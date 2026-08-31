using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Reads the authenticated user's id from the "sub" claim. Every protected endpoint that
    /// needs "the current user" goes through this — never through a client-supplied user id.
    /// </summary>
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (value is null || !Guid.TryParse(value, out var userId))
        {
            throw new InvalidOperationException("Authenticated request is missing a valid user id claim.");
        }

        return userId;
    }

    /// <summary>Reads the authenticated user's email from the "email" claim (always present — see JwtTokenService).</summary>
    public static string GetEmail(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(JwtRegisteredClaimNames.Email);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException("Authenticated request is missing an email claim.");
        }

        return value;
    }

    /// <summary>
    /// Reads the authenticated caller's role from the "role" claim (see JwtTokenService /
    /// Program.cs's RoleClaimType binding). Endpoint-level authorization should always go through
    /// [Authorize(Roles = "Admin")] rather than this — this exists for the handful of places
    /// (e.g. audit log "who did this") that need the value itself, not just a yes/no gate.
    /// </summary>
    public static UserRole GetRole(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue("role");
        return Enum.TryParse<UserRole>(value, out var role) ? role : UserRole.User;
    }
}
