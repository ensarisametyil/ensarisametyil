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
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Controllers;

public class AuthControllerTests
{
    private static AppDbContext CreateDbContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static (AuthController Controller, AppDbContext Db) CreateController()
    {
        var db = CreateDbContext();
        var authService = new AuthService(db, new PasswordHasher<User>(), new PasswordPolicy());
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
        var (controller, db) = CreateController();
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
}
