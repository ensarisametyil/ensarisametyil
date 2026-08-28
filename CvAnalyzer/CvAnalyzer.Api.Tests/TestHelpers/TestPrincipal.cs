using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Builds a ClaimsPrincipal shaped like the one JwtBearer middleware would attach to HttpContext.User for a real request.</summary>
public static class TestPrincipal
{
    public static ClaimsPrincipal ForUser(Guid userId, string email = "user@example.com")
    {
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
            },
            authenticationType: "TestAuth");

        return new ClaimsPrincipal(identity);
    }
}
