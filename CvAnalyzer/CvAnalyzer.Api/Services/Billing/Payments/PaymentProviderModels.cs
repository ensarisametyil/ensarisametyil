namespace CvAnalyzer.Api.Services.Billing.Payments;

/// <summary>
/// Buyer info Iyzico's checkout form requires for KYC/fraud-prevention purposes (Turkish
/// financial regulation). Collected transiently at checkout time — never persisted beyond the
/// Iyzico request itself; the User entity is not extended with these fields (out of this
/// stage's scope, and not needed for anything else in the app).
/// </summary>
public sealed record CheckoutBuyerInfo(
    string Name,
    string Surname,
    string IdentityNumber,
    string GsmNumber,
    string City,
    string AddressLine);

public sealed record SubscriptionCheckoutRequest(
    string ConversationId,
    string CallbackUrl,
    string CustomerEmail,
    CheckoutBuyerInfo Buyer);

public sealed record CheckoutInitializationResult(bool Success, string? Token, string? CheckoutFormContent, string? ErrorMessage);

/// <summary>Result of resolving a checkout form token to its outcome (the CF-Retrieve step) — ProviderStatus is the raw Iyzico subscription status string (e.g. "ACTIVE").</summary>
public sealed record SubscriptionCheckoutResult(bool Success, string? SubscriptionReferenceCode, string? CustomerReferenceCode, string? ProviderStatus, string? ErrorMessage);

/// <summary>Result of an authoritative, server-to-server "what is this subscription's status right now" call — never derived from a webhook/callback payload alone.</summary>
public sealed record ProviderSubscriptionState(bool Found, string? ProviderStatus, string? ErrorMessage);
