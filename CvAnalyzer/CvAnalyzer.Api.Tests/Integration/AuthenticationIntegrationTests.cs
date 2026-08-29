using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using CvAnalyzer.Api.Models.Dtos.Auth;
using Microsoft.IdentityModel.Tokens;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Exercises the real JWT authentication middleware end-to-end (real HTTP requests through the
/// real pipeline) — the one thing a controller-level unit test structurally cannot verify, since
/// [Authorize] is enforced before the controller action ever runs.
/// </summary>
public class AuthenticationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthenticationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Me_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithGarbageToken_ReturnsUnauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not.a.valid.jwt");

        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithTokenSignedByWrongKey_ReturnsUnauthorized()
    {
        var token = CreateToken(Guid.NewGuid(), "test@example.com", DateTime.UtcNow.AddMinutes(10), signingKey: "a-completely-different-signing-key-0123456789ABCDEF");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithExpiredToken_ReturnsUnauthorized()
    {
        var expiredToken = CreateToken(Guid.NewGuid(), "test@example.com", DateTime.UtcNow.AddMinutes(-10));
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", expiredToken);

        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Upload_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.PostAsync("/api/cv/upload", new MultipartFormDataContent());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task BillingUsage_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/billing/usage");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task BillingCheckout_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/billing/checkout", new
        {
            name = "Ada",
            surname = "Lovelace",
            identityNumber = "11111111111",
            gsmNumber = "5551234567",
            city = "Istanbul",
            addressLine = "Test Sk. No:1",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RegisterThenLoginThenMe_FullFlow_Works()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "Password123" });
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);
        var registerBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(registerBody);
        Assert.False(string.IsNullOrWhiteSpace(registerBody!.AccessToken));

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new { email, password = "Password123" });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        Assert.NotNull(loginBody);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginBody!.AccessToken);
        var meResponse = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var meBody = await meResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.Equal(email, meBody!.Email);
    }

    [Fact]
    public async Task Register_ResponseBody_NeverContainsPasswordHash()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "Password123" });
        var raw = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("passwordHash", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password123", raw, StringComparison.Ordinal);
    }

    private static string CreateToken(Guid userId, string email, DateTime expiresAtUtc, string? signingKey = null)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey ?? CustomWebApplicationFactory.TestJwtSigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: CustomWebApplicationFactory.TestJwtIssuer,
            audience: CustomWebApplicationFactory.TestJwtAudience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
