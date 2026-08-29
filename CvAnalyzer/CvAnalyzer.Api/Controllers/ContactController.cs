using System.Net.Mail;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.RateLimiting;
using CvAnalyzer.Api.Services.Contact;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// Public contact form. Anonymous by design (a visitor asking a question is, by definition, not
/// necessarily signed in yet) but still attributed to the caller's account when a valid JWT is
/// present, since that's a strictly more useful support record than an anonymous one.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/contact")]
[EnableRateLimiting(RateLimitPolicies.Contact)]
public class ContactController : ControllerBase
{
    private const int MaxNameLength = 200;
    private const int MaxSubjectLength = 200;
    private const int MaxMessageLength = 4000;

    private readonly IContactService _contactService;

    public ContactController(IContactService contactService)
    {
        _contactService = contactService;
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit(ContactRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Ad, e-posta, konu ve mesaj zorunludur."));
        }

        if (request.Name.Length > MaxNameLength || request.Subject.Length > MaxSubjectLength || request.Message.Length > MaxMessageLength)
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Girilen bilgiler izin verilen uzunluğu aşıyor."));
        }

        if (!MailAddress.TryCreate(request.Email, out _))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Geçerli bir e-posta adresi giriniz."));
        }

        var userId = User.Identity?.IsAuthenticated == true ? User.GetUserId() : (Guid?)null;
        await _contactService.SubmitAsync(userId, request.Name, request.Email, request.Subject, request.Message, cancellationToken);

        return Ok(new { message = "Mesajınız alındı." });
    }
}
