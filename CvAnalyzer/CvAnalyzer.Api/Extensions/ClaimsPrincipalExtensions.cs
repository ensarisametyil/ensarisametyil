using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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
}
