using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Auth;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.RateLimiting;
using CvAnalyzer.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvAnalyzer.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    /// <summary>
    /// Every action here accepts a handful of short strings (email/password/token) — nothing
    /// legitimate is anywhere near this size. Bounding the body pre-deserialization stops a
    /// caller from forcing the JSON model binder to buffer/parse an oversized payload (a cheap
    /// memory-pressure DoS vector) before any of this controller's own length validation runs.
    /// </summary>
    private const long MaxSmallJsonBodyBytes = 8 * 1024;

    private readonly IAuthService _authService;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(IAuthService authService, IJwtTokenService jwtTokenService)
    {
        _authService = authService;
        _jwtTokenService = jwtTokenService;
    }

    [HttpPost("register")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
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
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
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

    /// <summary>Requires the current password (never just the JWT) so a hijacked-but-not-fully-compromised session can't silently lock the real owner out.</summary>
    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting(RateLimitPolicies.Account)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Mevcut ve yeni parola zorunludur."));
        }

        try
        {
            await _authService.ChangePasswordAsync(User.GetUserId(), request.CurrentPassword, request.NewPassword, cancellationToken);
            return Ok(new MessageResponseDto("Parolanız güncellendi."));
        }
        catch (IncorrectPasswordException ex)
        {
            return BadRequest(new ErrorResponseDto("INCORRECT_CURRENT_PASSWORD", ex.Message));
        }
        catch (WeakPasswordException ex)
        {
            return BadRequest(new ErrorResponseDto("WEAK_PASSWORD", ex.Message));
        }
    }

    /// <summary>
    /// Always returns the exact same response whether or not the email is registered — an
    /// attacker must never be able to use this endpoint to learn which emails have accounts.
    /// The returned message is deliberately honest about this environment not having a real email
    /// provider wired up yet (see docs/authentication.md) rather than falsely claiming an email
    /// was sent.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.PasswordReset)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
    [ProducesResponseType(typeof(MessageResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequestDto request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            await _authService.RequestPasswordResetAsync(request.Email, cancellationToken);
        }

        return Ok(new MessageResponseDto(
            "İsteğiniz alındı. Bu ortamda e-posta gönderim altyapısı henüz aktif değildir; " +
            "şifre sıfırlama bağlantıları production ortamında e-posta ile iletilecektir."));
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.PasswordReset)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Bağlantı ve yeni parola zorunludur."));
        }

        try
        {
            await _authService.ResetPasswordAsync(request.Token, request.NewPassword, cancellationToken);
            return Ok(new MessageResponseDto("Parolanız güncellendi. Şimdi giriş yapabilirsiniz."));
        }
        catch (InvalidOrExpiredTokenException ex)
        {
            return BadRequest(new ErrorResponseDto("INVALID_OR_EXPIRED_TOKEN", ex.Message));
        }
        catch (WeakPasswordException ex)
        {
            return BadRequest(new ErrorResponseDto("WEAK_PASSWORD", ex.Message));
        }
    }

    /// <summary>No enumeration concern here (unlike forgot-password) — the caller is already authenticated as the account in question.</summary>
    [HttpPost("send-verification")]
    [Authorize]
    [EnableRateLimiting(RateLimitPolicies.Account)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
    [ProducesResponseType(typeof(MessageResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendVerification(CancellationToken cancellationToken)
    {
        await _authService.RequestEmailVerificationAsync(User.GetUserId(), cancellationToken);
        return Ok(new MessageResponseDto(
            "Doğrulama bağlantısı oluşturuldu. Bu ortamda e-posta gönderim altyapısı henüz aktif değildir; " +
            "e-posta doğrulama production ortamında tamamlanacaktır."));
    }

    [HttpPost("verify-email")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.PasswordReset)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Bağlantı zorunludur."));
        }

        try
        {
            await _authService.VerifyEmailAsync(request.Token, cancellationToken);
            return Ok(new MessageResponseDto("E-posta adresiniz doğrulandı."));
        }
        catch (InvalidOrExpiredTokenException ex)
        {
            return BadRequest(new ErrorResponseDto("INVALID_OR_EXPIRED_TOKEN", ex.Message));
        }
    }

    /// <summary>
    /// Soft-closes the account (User.IsActive = false) — CVs/analyses/subscriptions/payment
    /// records are preserved (see docs/authentication.md for why a hard delete would be unsafe
    /// here). The still-valid JWT this response is served with is immediately made unusable on
    /// every subsequent request by <see cref="Filters.ActiveAccountFilter"/>.
    /// </summary>
    [HttpPost("deactivate")]
    [Authorize]
    [EnableRateLimiting(RateLimitPolicies.Account)]
    [RequestSizeLimit(MaxSmallJsonBodyBytes)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Deactivate(DeactivateAccountRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Parola zorunludur."));
        }

        try
        {
            await _authService.DeactivateAccountAsync(User.GetUserId(), request.Password, cancellationToken);
            return Ok(new MessageResponseDto("Hesabınız kapatıldı."));
        }
        catch (IncorrectPasswordException ex)
        {
            return BadRequest(new ErrorResponseDto("INCORRECT_PASSWORD", ex.Message));
        }
    }

    private AuthResponseDto BuildAuthResponse(User user)
    {
        var token = _jwtTokenService.CreateToken(user);
        var expiresInSeconds = (int)Math.Max(0, (token.ExpiresAtUtc - DateTime.UtcNow).TotalSeconds);
        return new AuthResponseDto(token.AccessToken, "Bearer", expiresInSeconds, ToUserDto(user));
    }

    private static UserDto ToUserDto(User user) => new(user.Id, user.Email, user.CreatedAt, user.EmailVerifiedAt, user.Role.ToString());
}
