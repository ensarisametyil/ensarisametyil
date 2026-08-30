using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Auth;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Auth;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Controllers;

public class AuthControllerTests
{
    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static (AuthController Controller, AppDbContext Db) CreateController()
    {
        var db = CreateDbContext();
        var authService = new AuthService(db, new PasswordHasher<User>(), new PasswordPolicy(), TimeProvider.System, new FakeEmailService());
        var jwtOptions = Options.Create(new JwtOptions
        {
            Issuer = "test-issuer",
            Audience = "test-audience",
            SigningKey = "unit-test-signing-key-not-used-for-anything-real-0123456789",
            ExpirationMinutes = 60,
        });
        var jwtTokenService = new JwtTokenService(jwtOptions);

        return (new AuthController(authService, jwtTokenService), db);
    }

    [Fact]
    public async Task Register_ValidInput_ReturnsAuthResponseWithoutPasswordHash()
    {
        var (controller, _) = CreateController();

        var response = await controller.Register(new RegisterRequestDto("new@example.com", "Password123"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var body = Assert.IsType<AuthResponseDto>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));
        Assert.Equal("Bearer", body.TokenType);
        Assert.Equal("new@example.com", body.User.Email);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflict()
    {
        var (controller, _) = CreateController();
        await controller.Register(new RegisterRequestDto("dup@example.com", "Password123"), CancellationToken.None);

        var response = await controller.Register(new RegisterRequestDto("dup@example.com", "Password123"), CancellationToken.None);

        var conflict = Assert.IsType<ConflictObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(conflict.Value);
        Assert.Equal("EMAIL_ALREADY_REGISTERED", error.Code);
    }

    [Fact]
    public async Task Register_WeakPassword_ReturnsBadRequest()
    {
        var (controller, _) = CreateController();

        var response = await controller.Register(new RegisterRequestDto("weak@example.com", "short"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("WEAK_PASSWORD", error.Code);
    }

    [Fact]
    public async Task Login_CorrectCredentials_ReturnsAccessToken()
    {
        var (controller, _) = CreateController();
        await controller.Register(new RegisterRequestDto("login@example.com", "Password123"), CancellationToken.None);

        var response = await controller.Login(new LoginRequestDto("login@example.com", "Password123"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var body = Assert.IsType<AuthResponseDto>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var (controller, _) = CreateController();
        await controller.Register(new RegisterRequestDto("login2@example.com", "Password123"), CancellationToken.None);

        var response = await controller.Login(new LoginRequestDto("login2@example.com", "WrongPassword9"), CancellationToken.None);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(unauthorized.Value);
        Assert.Equal("INVALID_CREDENTIALS", error.Code);
    }

    [Fact]
    public async Task Me_AuthenticatedUser_ReturnsUserDto()
    {
        var (controller, _) = CreateController();
        var registerResponse = await controller.Register(new RegisterRequestDto("me@example.com", "Password123"), CancellationToken.None);
        var userId = ((AuthResponseDto)((OkObjectResult)registerResponse).Value!).User.Id;

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = TestPrincipal.ForUser(userId, "me@example.com") },
        };

        var response = await controller.Me(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var user = Assert.IsType<UserDto>(ok.Value);
        Assert.Equal(userId, user.Id);
        Assert.Equal("me@example.com", user.Email);
    }

    private static async Task<Guid> RegisterAndGetUserIdAsync(AuthController controller, string email, string password)
    {
        var response = await controller.Register(new RegisterRequestDto(email, password), CancellationToken.None);
        return ((AuthResponseDto)((OkObjectResult)response).Value!).User.Id;
    }

    private static void AuthenticateAs(AuthController controller, Guid userId, string email)
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = TestPrincipal.ForUser(userId, email) },
        };
    }

    [Fact]
    public async Task ChangePassword_CorrectCurrentPassword_ReturnsOk()
    {
        var (controller, _) = CreateController();
        var userId = await RegisterAndGetUserIdAsync(controller, "cp@example.com", "OldPassword1");
        AuthenticateAs(controller, userId, "cp@example.com");

        var response = await controller.ChangePassword(new ChangePasswordRequestDto("OldPassword1", "NewPassword2"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequest()
    {
        var (controller, _) = CreateController();
        var userId = await RegisterAndGetUserIdAsync(controller, "cp2@example.com", "OldPassword1");
        AuthenticateAs(controller, userId, "cp2@example.com");

        var response = await controller.ChangePassword(new ChangePasswordRequestDto("WrongPassword9", "NewPassword2"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INCORRECT_CURRENT_PASSWORD", error.Code);
    }

    [Fact]
    public async Task ForgotPassword_KnownAndUnknownEmail_ReturnSameResponse()
    {
        // The whole point of this endpoint's design — never let a caller learn which emails are
        // registered by comparing responses.
        var (controller, _) = CreateController();
        await controller.Register(new RegisterRequestDto("known@example.com", "Password123"), CancellationToken.None);

        var knownResponse = (OkObjectResult)await controller.ForgotPassword(new ForgotPasswordRequestDto("known@example.com"), CancellationToken.None);
        var unknownResponse = (OkObjectResult)await controller.ForgotPassword(new ForgotPasswordRequestDto("unknown@example.com"), CancellationToken.None);

        var knownMessage = ((MessageResponseDto)knownResponse.Value!).Message;
        var unknownMessage = ((MessageResponseDto)unknownResponse.Value!).Message;
        Assert.Equal(knownMessage, unknownMessage);
    }

    [Fact]
    public async Task ForgotPassword_NeverClaimsAnEmailWasSent()
    {
        // This environment has no real email provider wired up — the response must not lie about it.
        var (controller, _) = CreateController();

        var response = (OkObjectResult)await controller.ForgotPassword(new ForgotPasswordRequestDto("anyone@example.com"), CancellationToken.None);

        var message = ((MessageResponseDto)response.Value!).Message;
        Assert.DoesNotContain("gönderildi", message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ResetPassword_InvalidToken_ReturnsBadRequest()
    {
        var (controller, _) = CreateController();

        var response = await controller.ResetPassword(new ResetPasswordRequestDto("garbage-token", "NewPassword2"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_OR_EXPIRED_TOKEN", error.Code);
    }

    [Fact]
    public async Task Deactivate_CorrectPassword_ReturnsOkAndBlocksSubsequentLogin()
    {
        var (controller, _) = CreateController();
        var userId = await RegisterAndGetUserIdAsync(controller, "deact@example.com", "Password123");
        AuthenticateAs(controller, userId, "deact@example.com");

        var response = await controller.Deactivate(new DeactivateAccountRequestDto("Password123"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
        var loginResponse = await controller.Login(new LoginRequestDto("deact@example.com", "Password123"), CancellationToken.None);
        Assert.IsType<UnauthorizedObjectResult>(loginResponse);
    }

    [Fact]
    public async Task Deactivate_WrongPassword_ReturnsBadRequestAndAccountStaysActive()
    {
        var (controller, _) = CreateController();
        var userId = await RegisterAndGetUserIdAsync(controller, "deact2@example.com", "Password123");
        AuthenticateAs(controller, userId, "deact2@example.com");

        var response = await controller.Deactivate(new DeactivateAccountRequestDto("WrongPassword9"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INCORRECT_PASSWORD", error.Code);

        var loginResponse = await controller.Login(new LoginRequestDto("deact2@example.com", "Password123"), CancellationToken.None);
        Assert.IsType<OkObjectResult>(loginResponse);
    }

    [Fact]
    public async Task SendVerification_AuthenticatedUser_ReturnsOk()
    {
        var (controller, _) = CreateController();
        var userId = await RegisterAndGetUserIdAsync(controller, "verify@example.com", "Password123");
        AuthenticateAs(controller, userId, "verify@example.com");

        var response = await controller.SendVerification(CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
    }

    [Fact]
    public async Task VerifyEmail_InvalidToken_ReturnsBadRequest()
    {
        var (controller, _) = CreateController();

        var response = await controller.VerifyEmail(new VerifyEmailRequestDto("garbage-token"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_OR_EXPIRED_TOKEN", error.Code);
    }
}
