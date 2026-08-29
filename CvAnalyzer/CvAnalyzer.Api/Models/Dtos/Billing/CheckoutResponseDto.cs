namespace CvAnalyzer.Api.Models.Dtos.Billing;

/// <summary>CheckoutFormContent is the HTML/script snippet Iyzico expects the frontend to render (it injects its own hosted payment form/iframe).</summary>
public record CheckoutResponseDto(string Token, string CheckoutFormContent);
