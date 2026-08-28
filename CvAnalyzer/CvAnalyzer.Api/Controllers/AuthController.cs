using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Auth;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(IAuthService authService, IJwtTokenService jwtTokenService)
    {
        _authService = authService;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(RegisterRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "E-posta ve parola zorunludur."));
        }

        try
        {
            var user = await _authService.RegisterAsync(request.Email, request.Password, cancellationToken);
            return Ok(BuildAuthResponse(user));
        }
        catch (WeakPasswordException ex)
        {
            return BadRequest(new ErrorResponseDto("WEAK_PASSWORD", ex.Message));
        }
        catch (EmailAlreadyRegisteredException ex)
        {
            return Conflict(new ErrorResponseDto("EMAIL_ALREADY_REGISTERED", ex.Message));
        }
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(LoginRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "E-posta ve parola zorunludur."));
        }

        try
        {
            var user = await _authService.LoginAsync(request.Email, request.Password, cancellationToken);
            return Ok(BuildAuthResponse(user));
        }
        catch (InvalidCredentialsException ex)
        {
            return Unauthorized(new ErrorResponseDto("INVALID_CREDENTIALS", ex.Message));
        }
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var user = await _authService.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            // The JWT was valid but the account no longer exists — treat it the same as any
            // other authentication failure rather than a 404 (nothing about the account is
            // worth revealing to a caller presenting a stale token).
            return Unauthorized();
        }

        return Ok(ToUserDto(user));
    }

    private AuthResponseDto BuildAuthResponse(User user)
    {
        var token = _jwtTokenService.CreateToken(user);
        var expiresInSeconds = (int)Math.Max(0, (token.ExpiresAtUtc - DateTime.UtcNow).TotalSeconds);
        return new AuthResponseDto(token.AccessToken, "Bearer", expiresInSeconds, ToUserDto(user));
    }

    private static UserDto ToUserDto(User user) => new(user.Id, user.Email, user.CreatedAt);
}
