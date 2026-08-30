using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Dtos.Billing;
using CvAnalyzer.Api.RateLimiting;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Controllers;

/// <summary>
/// GET/POST endpoints scoped to the authenticated caller (userId always from the JWT — see
/// BillingController_ExposesNoWayToSetOrChangeAPlan / no client input can set a plan) plus two
/// intentionally unauthenticated endpoints (checkout callback, Iyzico webhook) that instead trust
/// only what THIS API itself already recorded (PaymentTransaction/Subscription rows) plus, for
/// the webhook, a verified provider signature — never a client- or provider-payload-supplied
/// user id. See docs/iyzico-integration.md for the full flow and its security model.
/// </summary>
[ApiController]
[Authorize]
[Route("api/billing")]
public class BillingController : ControllerBase
{
    /// <summary>
    /// Every JSON/form body this controller accepts (checkout buyer info, the callback token,
    /// the webhook's reference codes) is a handful of short strings. Bounding the raw body
    /// pre-deserialization stops a caller — including the two [AllowAnonymous] endpoints, which
    /// have no auth-based rate limiting to fall back on — from forcing an oversized payload
    /// through the model binder before any application-level validation runs.
    /// </summary>
    private const long MaxSmallBodyBytes = 8 * 1024;

    private readonly IAnalysisQuotaService _quotaService;
    private readonly IPaymentService _paymentService;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IPlanCatalog _planCatalog;
    private readonly IyzicoOptions _iyzicoOptions;
    private readonly ILogger<BillingController> _logger;

    public BillingController(
        IAnalysisQuotaService quotaService,
        IPaymentService paymentService,
        ISubscriptionService subscriptionService,
        IPlanCatalog planCatalog,
        IOptions<IyzicoOptions> iyzicoOptions,
        ILogger<BillingController> logger)
    {
        _quotaService = quotaService;
        _paymentService = paymentService;
        _subscriptionService = subscriptionService;
        _planCatalog = planCatalog;
        _iyzicoOptions = iyzicoOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Public plan catalog (limits + price) — the single backend-owned source of truth the
    /// frontend reads Premium's price from, rather than hard-coding it. Unauthenticated on
    /// purpose: the public Landing page must be able to show "$10/month" before anyone signs in.
    /// </summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PlanCatalogDto), StatusCodes.Status200OK)]
    public IActionResult GetPlans()
    {
        var free = _planCatalog.GetPlan(Models.Entities.PlanType.Free);
        var premium = _planCatalog.GetPlan(Models.Entities.PlanType.Premium);

        return Ok(new PlanCatalogDto(
            new PlanPricingDto(free.MonthlyAnalysisLimit, free.MonthlyPriceUsd, null),
            new PlanPricingDto(premium.MonthlyAnalysisLimit, premium.MonthlyPriceUsd, premium.MonthlyPriceUsd is null ? null : "USD")));
    }

    [HttpGet("usage")]
    [ProducesResponseType(typeof(UsageDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsage(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var summary = await _quotaService.GetUsageSummaryAsync(userId, cancellationToken);

        return Ok(new UsageDto(
            summary.Plan.ToString().ToUpperInvariant(),
            summary.Used,
            summary.Limit,
            summary.Remaining,
            summary.PeriodStart,
            summary.PeriodEnd));
    }

    /// <summary>Richer detail than GET /api/billing/usage's bare plan string — for the account/billing page. A Free user who has never checked out gets an all-null detail, not an error.</summary>
    [HttpGet("subscription")]
    [ProducesResponseType(typeof(SubscriptionDetailsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSubscription(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var subscription = await _subscriptionService.GetCurrentSubscriptionAsync(userId, cancellationToken);
        if (subscription is null)
        {
            return Ok(new SubscriptionDetailsDto("FREE", null, null, null, null, false));
        }

        var canCancel = subscription.Plan == Models.Entities.PlanType.Premium && subscription.Status == Models.Entities.SubscriptionStatus.Active;
        return Ok(new SubscriptionDetailsDto(
            subscription.Plan.ToString().ToUpperInvariant(),
            subscription.Status.ToString().ToUpperInvariant(),
            subscription.Provider,
            subscription.StartDate,
            subscription.EndDate,
            canCancel));
    }

    /// <summary>
    /// Cancels the caller's own active Premium subscription via Iyzico. Never accepts a
    /// subscription/user id from the request — always resolves "which subscription" from the
    /// caller's own JWT identity, exactly like every other endpoint here.
    /// </summary>
    [HttpPost("subscription/cancel")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelSubscription(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var result = await _paymentService.CancelPremiumSubscriptionAsync(userId, cancellationToken);
        if (!result.Success)
        {
            return BadRequest(new ErrorResponseDto("CANCELLATION_FAILED", result.ErrorMessage ?? "Abonelik iptal edilemedi."));
        }

        return Ok(new { message = "Aboneliğiniz iptal edildi." });
    }

    /// <summary>The caller's own past checkout attempts, newest first — never any other user's rows, and never a raw provider payload.</summary>
    [HttpGet("payments")]
    [ProducesResponseType(typeof(List<PaymentHistoryItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPaymentHistory(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        var history = await _paymentService.GetPaymentHistoryAsync(userId, cancellationToken);
        return Ok(history.Select(h => new PaymentHistoryItemDto(h.Date, h.Status, h.Provider, h.SubscriptionReference, h.Amount, h.Currency)).ToList());
    }

    /// <summary>
    /// Starts a Premium subscription checkout for the authenticated caller. The request carries
    /// only the buyer info Iyzico's checkout form requires — never a plan or payment-outcome
    /// claim; the response is just a token/form to render, not a Premium grant.
    /// </summary>
    [HttpPost("checkout")]
    [EnableRateLimiting(RateLimitPolicies.Checkout)]
    [RequestSizeLimit(MaxSmallBodyBytes)]
    [ProducesResponseType(typeof(CheckoutResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponseDto), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> StartCheckout(CheckoutRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Surname) ||
            string.IsNullOrWhiteSpace(request.IdentityNumber) || string.IsNullOrWhiteSpace(request.GsmNumber) ||
            string.IsNullOrWhiteSpace(request.City) || string.IsNullOrWhiteSpace(request.AddressLine))
        {
            return BadRequest(new ErrorResponseDto("INVALID_REQUEST", "Ödeme için gerekli bilgiler eksik."));
        }

        var userId = User.GetUserId();
        var email = User.GetEmail();
        var buyer = new CheckoutBuyerInfo(request.Name, request.Surname, request.IdentityNumber, request.GsmNumber, request.City, request.AddressLine);

        var result = await _paymentService.StartPremiumCheckoutAsync(userId, email, buyer, cancellationToken);
        if (!result.Success)
        {
            // "Already Premium" and "provider unavailable" are both reported the same safe way —
            // no internal detail, no distinction that would help an attacker probe plan state
            // beyond what GET /api/billing/usage already legitimately reveals to this same user.
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponseDto("CHECKOUT_UNAVAILABLE", result.ErrorMessage ?? "Ödeme başlatılamadı."));
        }

        return Ok(new CheckoutResponseDto(result.Token!, result.CheckoutFormContent!));
    }

    /// <summary>
    /// Iyzico's checkout form redirects the buyer's browser here (a same-origin form POST) with
    /// the checkout token after payment. Deliberately unauthenticated — the browser at this point
    /// carries no guarantee of still holding this app's JWT (e.g. a new tab), and Iyzico has no
    /// way to attach one. Trust instead comes from resolving the token back to a PaymentTransaction
    /// this API itself created, then an authoritative server-to-server confirmation — never from
    /// anything in this request. Always ends in a redirect, never a JSON API response.
    /// </summary>
    [HttpPost("checkout/callback")]
    [AllowAnonymous]
    [RequestSizeLimit(MaxSmallBodyBytes)]
    public async Task<IActionResult> CheckoutCallback([FromForm] string? token, CancellationToken cancellationToken)
    {
        token ??= Request.Query["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            return Redirect($"{_iyzicoOptions.FrontendResultUrl}?status=failed");
        }

        var outcome = await _paymentService.ProcessCheckoutCallbackAsync(token, cancellationToken);
        return Redirect($"{_iyzicoOptions.FrontendResultUrl}?status={(outcome.Success ? "success" : "failed")}");
    }

    /// <summary>
    /// Async server-to-server notification from Iyzico for subscription lifecycle events
    /// (renewals, cancellations, expirations). Deliberately unauthenticated (no JWT — this is
    /// Iyzico calling us, not a browser); authenticity instead comes from the X-IYZ-SIGNATURE-V3
    /// header (see IyzicoWebhookSignatureVerifier) plus an authoritative server-to-server
    /// re-confirmation before anything is mutated. Always returns 200 once the payload has been
    /// safely handled (processed or safely ignored) so Iyzico doesn't endlessly retry a duplicate;
    /// only a genuinely invalid signature is rejected with 401.
    /// </summary>
    [HttpPost("webhook/iyzico")]
    [AllowAnonymous]
    [RequestSizeLimit(MaxSmallBodyBytes)]
    public async Task<IActionResult> IyzicoWebhook([FromBody] IyzicoWebhookRequestDto body, CancellationToken cancellationToken)
    {
        var signature = Request.Headers["X-IYZ-SIGNATURE-V3"].ToString();
        var payload = new IyzicoWebhookPayload(body.IyziEventType, body.SubscriptionReferenceCode, body.OrderReferenceCode, body.CustomerReferenceCode);

        // Never log the signature header or the secret key — only enough to correlate in
        // diagnostics (event type + provider reference codes, all non-secret by nature).
        _logger.LogInformation(
            "Iyzico webhook received. EventType={EventType} SubscriptionReferenceCode={SubscriptionReferenceCode}",
            payload.EventType, payload.SubscriptionReferenceCode);

        if (string.IsNullOrWhiteSpace(signature))
        {
            return Unauthorized();
        }

        var result = await _paymentService.ProcessWebhookAsync(payload, signature, cancellationToken);

        // Rejected (bad/missing signature) is the only outcome that must surface as 401 — a
        // caller without the real secret key must never get the same 200 a genuine Iyzico call
        // gets, or a signature-guessing attack becomes indistinguishable from success. Ignored
        // (authentic but nothing actionable, e.g. an unknown or duplicate event) and Processed
        // both return 200 so Iyzico doesn't endlessly retry a call it correctly delivered.
        return result == WebhookProcessingResult.Rejected ? Unauthorized() : Ok();
    }
}
