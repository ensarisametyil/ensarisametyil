namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>
/// Buyer info Iyzico's checkout form requires (see CheckoutBuyerInfo). Never contains a plan
/// or payment-success flag — the client cannot claim anything about the outcome of a payment it
/// hasn't made yet.
/// </summary>
public record CheckoutRequestDto(
    string Name,
    string Surname,
    string IdentityNumber,
    string GsmNumber,
    string City,
    string AddressLine);
