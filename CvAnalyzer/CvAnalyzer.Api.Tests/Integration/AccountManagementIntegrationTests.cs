using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using CvAnalyzer.Api.Models.Dtos.Auth;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Exercises account-management endpoints through the real HTTP pipeline — specifically
/// ActiveAccountFilter, which only takes effect via middleware/global-filter execution and can't
/// be verified by a controller-level unit test.
/// </summary>
public class AccountManagementIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AccountManagementIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Deactivate_ThenReuseTheSameStillUnexpiredJwt_IsRejectedByActiveAccountFilter()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "Password123" });
        var registerBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", registerBody!.AccessToken);

        // Sanity check: the token works before deactivation.
        var beforeResponse = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, beforeResponse.StatusCode);

        var deactivateResponse = await _client.PostAsJsonAsync("/api/auth/deactivate", new { password = "Password123" });
        Assert.Equal(HttpStatusCode.OK, deactivateResponse.StatusCode);

        // The JWT itself is still cryptographically valid and unexpired — only ActiveAccountFilter's
        // fresh IsActive check can catch this.
        var afterResponse = await _client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, afterResponse.StatusCode);

        var billingResponse = await _client.GetAsync("/api/billing/usage");
        Assert.Equal(HttpStatusCode.Unauthorized, billingResponse.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ThenLoginWithNewPassword_Works()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "OldPassword1" });
        var registerBody = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", registerBody!.AccessToken);

        var changeResponse = await _client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = "OldPassword1", newPassword = "NewPassword2" });
        Assert.Equal(HttpStatusCode.OK, changeResponse.StatusCode);

        _client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new { email, password = "NewPassword2" });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/change-password", new { currentPassword = "a", newPassword = "b" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
