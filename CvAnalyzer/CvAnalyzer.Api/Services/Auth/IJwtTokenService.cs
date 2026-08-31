using CvAnalyzer.Api.Models.Entities;

namespace CvAnalyzer.Api.Services.Auth;

public record JwtToken(string AccessToken, DateTime ExpiresAtUtc);

public interface IJwtTokenService
{
    /// <summary>Issues a signed access token for the given user, carrying only the minimal claims needed (sub, email, role).</summary>
    JwtToken CreateToken(User user);
}
