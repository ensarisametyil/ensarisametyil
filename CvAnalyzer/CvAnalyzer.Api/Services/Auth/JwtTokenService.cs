using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CvAnalyzer.Api.Services.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public JwtToken CreateToken(User user)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_options.ExpirationMinutes);

        // Minimal claim set on purpose: just enough to identify the caller, nothing sensitive
        // (no password hash, no full profile) ever goes into the token payload.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // Carried so ASP.NET Core's built-in [Authorize(Roles = "Admin")] can enforce this at
            // the middleware layer (see Program.cs's RoleClaimType binding) — not something any
            // individual admin controller/action re-implements by hand.
            new Claim("role", user.Role.ToString()),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        return new JwtToken(accessToken, expiresAtUtc);
    }
}
