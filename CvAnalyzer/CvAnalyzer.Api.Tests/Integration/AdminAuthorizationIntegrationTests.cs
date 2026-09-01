using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Admin;
using CvAnalyzer.Api.Models.Dtos.Auth;
using CvAnalyzer.Api.Models.Dtos.Billing;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Exercises the Admin panel's API surface through the real HTTP pipeline — real
/// [Authorize(Roles = "Admin")] enforcement (something a controller-level unit test can't reach),
/// real JWT role-claim handling, and the actual authorization outcome a client sees (401/403),
/// not just what a controller method returns when called directly in-process.
///
/// One admin account is registered, promoted, and logged in ONCE per test class run (cached in a
/// static field — IClassFixture shares one app instance/rate-limiter across every test method
/// here) and reused by every test that needs an admin token, so this file's total register/login
/// calls stay comfortably under the default Auth rate-limit policy's 20-per-60s window — the same
/// window RateLimitingIntegrationTests asserts on for the real default, which this file
/// deliberately never touches.
/// </summary>
public class AdminAuthorizationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    private static string? _cachedAdminToken;
    private static Guid _cachedAdminUserId;

    private static readonly string[] AdminGetEndpoints =
    {
        "/api/admin/dashboard",
        "/api/admin/users",
        "/api/admin/payments",
        "/api/admin/audit-logs",
    };

    public AdminAuthorizationIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    private async Task<(string Token, Guid UserId, string Email)> RegisterAndGetTokenAsync()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "Password123" });
        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        return (body!.AccessToken, body.User.Id, body.User.Email);
    }

    private async Task PromoteToAdminAsync(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.SingleAsync(u => u.Id == userId);
        user.Role = UserRole.Admin;
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Returns the one admin this whole test class shares, registering/promoting/logging it in
    /// only the first time it's needed — a JWT's role claim is fixed at issuance, so it still
    /// needs one register + one login (not just register) to end up holding a token that actually
    /// carries "role: Admin".
    /// </summary>
    private async Task<(string Token, Guid UserId)> GetOrCreateAdminAsync()
    {
        if (_cachedAdminToken is not null)
        {
            return (_cachedAdminToken, _cachedAdminUserId);
        }

        var (_, userId, email) = await RegisterAndGetTokenAsync();
        await PromoteToAdminAsync(userId);

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new { email, password = "Password123" });
        var body = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();

        _cachedAdminToken = body!.AccessToken;
        _cachedAdminUserId = userId;
        return (_cachedAdminToken, _cachedAdminUserId);
    }

    private void AuthorizeAs(string token) =>
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    [Theory]
    [MemberData(nameof(EndpointCases))]
    public async Task AdminEndpoints_WithoutAnyToken_ReturnUnauthorized(string endpoint)
    {
        var response = await _client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(EndpointCases))]
    public async Task AdminEndpoints_AsANormalAuthenticatedUser_ReturnForbidden(string endpoint)
    {
        var (token, _, _) = await RegisterAndGetTokenAsync();
        AuthorizeAs(token);

        var response = await _client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(EndpointCases))]
    public async Task AdminEndpoints_AsAnAdmin_ReturnOk(string endpoint)
    {
        var (token, _) = await GetOrCreateAdminAsync();
        AuthorizeAs(token);

        var response = await _client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    public static IEnumerable<object[]> EndpointCases() => AdminGetEndpoints.Select(e => new object[] { e });

    [Fact]
    public async Task GetUserDetail_AsANormalUser_ReturnsForbidden_EvenForTheirOwnId()
    {
        var (token, userId, _) = await RegisterAndGetTokenAsync();
        AuthorizeAs(token);

        // IDOR-shaped check: a normal user targeting their OWN id must still be rejected by the
        // role gate — this endpoint is admin-only regardless of whose id is in the URL.
        var response = await _client.GetAsync($"/api/admin/users/{userId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetUserDetail_AsAdmin_ReturnsAnotherUsersFullDetail()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        var (_, targetUserId, targetEmail) = await RegisterAndGetTokenAsync();
        AuthorizeAs(adminToken);

        var response = await _client.GetAsync($"/api/admin/users/{targetUserId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await response.Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.Equal(targetUserId, detail!.Id);
        Assert.Equal(targetEmail, detail.Email);
        Assert.Equal("Free", detail.Plan);
    }

    [Fact]
    public async Task GetUserDetail_NonexistentUser_ReturnsNotFound()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        AuthorizeAs(adminToken);

        var response = await _client.GetAsync($"/api/admin/users/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ListUsers_AsAdmin_FindsARegisteredUser_ViaSearch()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        var (_, _, targetEmail) = await RegisterAndGetTokenAsync();
        AuthorizeAs(adminToken);

        var searchTerm = targetEmail.Split('@')[0];
        var response = await _client.GetAsync($"/api/admin/users?search={searchTerm}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.ReadFromJsonAsync<PagedResultDto<AdminUserListItemDto>>();
        Assert.Contains(page!.Items, u => u.Email == targetEmail);
    }

    [Fact]
    public async Task SetActive_AsAdmin_DeactivatesAnotherUser()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        var (_, targetUserId, _) = await RegisterAndGetTokenAsync();
        AuthorizeAs(adminToken);

        var response = await _client.PatchAsync($"/api/admin/users/{targetUserId}/active", JsonContent.Create(new { isActive = false }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var detailResponse = await _client.GetAsync($"/api/admin/users/{targetUserId}");
        var detail = await detailResponse.Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.False(detail!.IsActive);
    }

    [Fact]
    public async Task SetActive_AdminTargetingTheirOwnAccount_IsRejected()
    {
        var (adminToken, adminUserId) = await GetOrCreateAdminAsync();
        AuthorizeAs(adminToken);

        var response = await _client.PatchAsync($"/api/admin/users/{adminUserId}/active", JsonContent.Create(new { isActive = false }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SetActive_AsANormalUser_IsForbidden()
    {
        var (token, _, _) = await RegisterAndGetTokenAsync();
        AuthorizeAs(token);

        var response = await _client.PatchAsync($"/api/admin/users/{Guid.NewGuid()}/active", JsonContent.Create(new { isActive = false }));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SetRole_AsAdmin_PromotesAnotherUser_AndRejectsAnInvalidRoleValue()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        var (_, targetUserId, _) = await RegisterAndGetTokenAsync();
        AuthorizeAs(adminToken);

        var invalid = await _client.PatchAsync($"/api/admin/users/{targetUserId}/role", JsonContent.Create(new { role = "SuperUser" }));
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

        var valid = await _client.PatchAsync($"/api/admin/users/{targetUserId}/role", JsonContent.Create(new { role = "Admin" }));
        Assert.Equal(HttpStatusCode.OK, valid.StatusCode);

        var detailResponse = await _client.GetAsync($"/api/admin/users/{targetUserId}");
        var detail = await detailResponse.Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.Equal("Admin", detail!.Role);
    }

    [Fact]
    public async Task FullPremiumPurchaseThenAdminCancel_EndToEnd_ReflectsInDashboardPaymentsAndAuditLog()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        var (userToken, targetUserId, _) = await RegisterAndGetTokenAsync();

        // The user buys Premium — same checkout/callback flow BillingCheckoutIntegrationTests
        // exercises, but here specifically to give the admin something real to see.
        AuthorizeAs(userToken);
        var checkoutResponse = await _client.PostAsJsonAsync("/api/billing/checkout", new
        {
            name = "Ada",
            surname = "Lovelace",
            identityNumber = "11111111111",
            gsmNumber = "5551234567",
            city = "Istanbul",
            addressLine = "Test Sk. No:1",
        });
        var checkoutBody = await checkoutResponse.Content.ReadFromJsonAsync<CheckoutResponseDto>();
        var callbackResponse = await _client.PostAsync(
            "/api/billing/checkout/callback",
            new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("token", checkoutBody!.Token) }));
        Assert.Contains("status=success", callbackResponse.Headers.Location!.ToString());

        // The admin can now see it in Payments, Dashboard revenue, and the user's own detail —
        // then cancels it via the admin action (never a direct DB write).
        AuthorizeAs(adminToken);

        var paymentsResponse = await _client.GetAsync("/api/admin/payments?status=Succeeded");
        var payments = await paymentsResponse.Content.ReadFromJsonAsync<PagedResultDto<AdminPaymentListItemDto>>();
        Assert.Contains(payments!.Items, p => p.UserId == targetUserId && p.Amount == 10.00m);

        var dashboardResponse = await _client.GetAsync("/api/admin/dashboard");
        var stats = await dashboardResponse.Content.ReadFromJsonAsync<AdminDashboardStatsDto>();
        Assert.True(stats!.TotalRevenueUsd >= 10.00m);
        Assert.True(stats.PremiumUsers >= 1);

        var detailBeforeCancel = await (await _client.GetAsync($"/api/admin/users/{targetUserId}")).Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.Equal("Premium", detailBeforeCancel!.Plan);

        // The authoritative re-confirmation PaymentService.CancelPremiumSubscriptionAsync performs
        // after calling the provider must see a genuinely-cancelled status, not the still-ACTIVE
        // default the checkout flow above relied on — same setup PaymentServiceTests uses.
        _factory.TestPaymentProvider.RetrieveResult = new(true, "CANCELED", null);
        var cancelResponse = await _client.PostAsync($"/api/admin/users/{targetUserId}/subscription/cancel", null);
        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        var detailAfterCancel = await (await _client.GetAsync($"/api/admin/users/{targetUserId}")).Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.Equal("Free", detailAfterCancel!.Plan);

        var auditLogResponse = await _client.GetAsync("/api/admin/audit-logs");
        var auditLog = await auditLogResponse.Content.ReadFromJsonAsync<PagedResultDto<AdminAuditLogEntryDto>>();
        Assert.Contains(auditLog!.Items, l => l.Action == nameof(AdminAuditAction.SubscriptionCancelled) && l.TargetEmail != null);
    }

    [Fact]
    public async Task CancelSubscription_AsANormalUser_IsForbidden()
    {
        var (token, _, _) = await RegisterAndGetTokenAsync();
        AuthorizeAs(token);

        var response = await _client.PostAsync($"/api/admin/users/{Guid.NewGuid()}/subscription/cancel", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminResponses_NeverExposeAPasswordHashOrAnyIyzicoSecret()
    {
        var (adminToken, _) = await GetOrCreateAdminAsync();
        AuthorizeAs(adminToken);

        var usersResponse = await _client.GetAsync("/api/admin/users");
        var usersBody = await usersResponse.Content.ReadAsStringAsync();

        Assert.DoesNotContain("passwordHash", usersBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(CustomWebApplicationFactory.TestIyzicoSecretKey, usersBody);
    }

    /// <summary>
    /// The exact attack the Stage 17 security audit calls out by name: take a normal user's own,
    /// genuinely-issued token and forge its "role" claim from "User" to "Admin" — the most direct
    /// possible privilege-escalation attempt against the admin panel's authorization model — then
    /// present it to a real admin endpoint. Rewriting the payload (even a single claim) changes the
    /// bytes the HMAC signature was computed over, so the forged token must fail signature
    /// validation and never reach the [Authorize(Roles = "Admin")] check at all — proving the
    /// client-supplied role claim is never the trust source, the signature is.
    /// </summary>
    [Fact]
    public async Task AdminEndpoint_WithNormalUsersTokenForgedToRoleAdmin_IsRejected()
    {
        var (token, _, _) = await RegisterAndGetTokenAsync();
        var forgedToken = ForgeRoleClaimToAdmin(token);
        AuthorizeAs(forgedToken);

        var response = await _client.GetAsync("/api/admin/dashboard");

        // Signature validation fails before role/authorization is ever evaluated — the forged
        // token is indistinguishable from any other tampered token, so this is 401, not 403.
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>Decodes a real JWT's payload, rewrites/adds a "role":"Admin" claim, and re-encodes it — deliberately leaving the original signature segment untouched, so the result is exactly what an attacker with only the ability to edit the token text (not the signing key) could produce.</summary>
    private static string ForgeRoleClaimToAdmin(string token)
    {
        var parts = token.Split('.');
        var payloadJson = System.Text.Json.JsonDocument.Parse(Base64UrlDecode(parts[1]));
        var claims = payloadJson.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => (object)p.Value.Clone());
        claims["role"] = "Admin";
        var forgedPayload = System.Text.Json.JsonSerializer.Serialize(claims);

        return $"{parts[0]}.{Base64UrlEncode(forgedPayload)}.{parts[2]}";
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        return Convert.FromBase64String(padded);
    }

    private static string Base64UrlEncode(string value) =>
        Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(value)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
