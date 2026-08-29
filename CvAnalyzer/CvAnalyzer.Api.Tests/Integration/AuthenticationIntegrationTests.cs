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
    public async Task Me_WithTamperedPayload_ReturnsUnauthorized()
    {
        var token = CreateToken(Guid.NewGuid(), "test@example.com", DateTime.UtcNow.AddMinutes(10));
        var parts = token.Split('.');
        // Flip one character in the payload segment — the signature (computed over the original
        // payload) will no longer match, exactly the class of attack signature verification exists
        // to catch (a forged/edited claim set riding on an otherwise-valid-looking token).
        var tamperedChar = parts[1][0] == 'a' ? 'b' : 'a';
        parts[1] = tamperedChar + parts[1][1..];
        var tamperedToken = string.Join('.', parts);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tamperedToken);

        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithUnsignedAlgNoneToken_ReturnsUnauthorized()
    {
        // The classic "alg: none" forgery — a token with no signature at all, relying on a
        // validator that skips signature checking for unsigned tokens. RequireSignedTokens=true
        // (explicit in Program.cs, on top of being the library default) must reject this.
        var token = CreateUnsignedAlgNoneToken(Guid.NewGuid(), "test@example.com", DateTime.UtcNow.AddMinutes(10));
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithForgedAlgorithmHeader_ReturnsUnauthorized()
    {
        // A token whose signature bytes are genuinely computed with the correct HMAC-SHA256 key
        // (so this isn't just "wrong signature") but whose header claims a different algorithm
        // (RS256). ValidAlgorithms pinned to HmacSha256 in Program.cs must reject this purely on
        // the declared algorithm, independent of whether the signature bytes happen to verify.
        var token = CreateTokenWithForgedAlgHeader(Guid.NewGuid(), "test@example.com", DateTime.UtcNow.AddMinutes(10), "RS256");
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

    /// <summary>Hand-builds an "alg: none" token — header and payload only, no signature segment at all.</summary>
    private static string CreateUnsignedAlgNoneToken(Guid userId, string email, DateTime expiresAtUtc)
    {
        var header = """{"alg":"none","typ":"JWT"}""";
        var payload = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, object>
        {
            ["sub"] = userId.ToString(),
            ["email"] = email,
            ["iss"] = CustomWebApplicationFactory.TestJwtIssuer,
            ["aud"] = CustomWebApplicationFactory.TestJwtAudience,
            ["exp"] = new DateTimeOffset(expiresAtUtc).ToUnixTimeSeconds(),
        });

        return $"{Base64UrlEncode(header)}.{Base64UrlEncode(payload)}.";
    }

    /// <summary>
    /// Hand-builds a token whose header falsely claims <paramref name="alg"/> but whose signature
    /// bytes are genuinely computed with HMAC-SHA256 over the real signing key — isolates testing
    /// of ValidAlgorithms pinning from plain signature-mismatch rejection.
    /// </summary>
    private static string CreateTokenWithForgedAlgHeader(Guid userId, string email, DateTime expiresAtUtc, string alg)
    {
        var header = $$"""{"alg":"{{alg}}","typ":"JWT"}""";
        var payload = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, object>
        {
            ["sub"] = userId.ToString(),
            ["email"] = email,
            ["iss"] = CustomWebApplicationFactory.TestJwtIssuer,
            ["aud"] = CustomWebApplicationFactory.TestJwtAudience,
            ["exp"] = new DateTimeOffset(expiresAtUtc).ToUnixTimeSeconds(),
        });

        var unsignedToken = $"{Base64UrlEncode(header)}.{Base64UrlEncode(payload)}";
        using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(CustomWebApplicationFactory.TestJwtSigningKey));
        var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsignedToken));

        return $"{unsignedToken}.{Base64UrlEncode(signatureBytes)}";
    }

    private static string Base64UrlEncode(string value) => Base64UrlEncode(Encoding.UTF8.GetBytes(value));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
