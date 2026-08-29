namespace CvAnalyzer.Api.Services.Billing.Payments;

/// <summary>
/// Bound from the "Iyzico" configuration section. ApiKey/SecretKey must never come from
/// appsettings.json in source control — see appsettings.json's empty placeholders. Development:
/// `dotnet user-secrets set Iyzico:ApiKey/SecretKey "..."`. Production: `Iyzico__ApiKey` /
/// `Iyzico__SecretKey` environment variables. Mirrors the existing AiOptions/JwtOptions pattern.
/// </summary>
public class IyzicoOptions
{
    public const string SectionName = "Iyzico";

    public string ApiKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Sandbox by default (https://sandbox-api.iyzipay.com). Production would be https://api.iyzipay.com.</summary>
    public string BaseUrl { get; set; } = "https://sandbox-api.iyzipay.com";

    /// <summary>
    /// Reference code of the Premium monthly subscription's pricing plan, created once in the
    /// Iyzico merchant panel (Products &amp; Plans). Not a secret, but merchant/environment-specific
    /// (sandbox vs production have different plans), so it lives in configuration, not code.
    /// </summary>
    public string PremiumPricingPlanReferenceCode { get; set; } = string.Empty;

    /// <summary>
    /// Absolute URL Iyzico's checkout form POSTs its result token back to
    /// (POST /api/billing/checkout/callback on THIS API, reachable from the internet in
    /// production — there is no such deployment yet, see docs/iyzico-integration.md). Explicit
    /// configuration rather than derived from the incoming request, since that's unreliable
    /// behind proxies/load balancers and Iyzico requires an exact registered callback URL.
    /// </summary>
    public string CallbackUrl { get; set; } = "http://localhost:5285/api/billing/checkout/callback";

    /// <summary>
    /// Frontend URL the user's browser is redirected to after PaymentService has processed the
    /// checkout callback (?status=success|failed is appended) — a plain page that calls
    /// GET /api/billing/usage to refresh and show the result. No plan decision happens on the
    /// frontend; this redirect only carries UX state, never a trust signal.
    /// </summary>
    public string FrontendResultUrl { get; set; } = "http://localhost:5173/premium/result";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ApiKey) &&
        !string.IsNullOrWhiteSpace(SecretKey) &&
        !string.IsNullOrWhiteSpace(PremiumPricingPlanReferenceCode);
}
