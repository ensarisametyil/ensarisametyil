using Iyzipay.Model;
using Iyzipay.Model.V2.Subscription;
using Iyzipay.Request.V2.Subscription;
using Microsoft.Extensions.Options;
using IyzicoOptionsModel = Iyzipay.Options;
using IyzicoSubscription = Iyzipay.Model.V2.Subscription.Subscription;

namespace CvAnalyzer.Api.Services.Billing.Payments;

/// <summary>
/// Real implementation, backed by the official Iyzipay .NET SDK (NuGet package "Iyzipay") talking
/// to Iyzico's Subscription product (https://docs.iyzico.com/en/products/subscription). The SDK's
/// static Subscription.* calls are synchronous (blocking HTTP under the hood — verified by
/// reflection over the installed package, no async overloads exist), so each call is wrapped in
/// Task.Run to avoid blocking an ASP.NET Core request thread.
///
/// Never logs ApiKey/SecretKey or full request/response bodies — only provider error codes and
/// reference codes (see docs/iyzico-integration.md, "Logging").
/// </summary>
public class IyzicoPaymentProvider : IPaymentProvider
{
    private readonly IyzicoOptionsModel _sdkOptions;
    private readonly string _pricingPlanReferenceCode;
    private readonly ILogger<IyzicoPaymentProvider> _logger;

    public IyzicoPaymentProvider(IOptions<IyzicoOptions> options, ILogger<IyzicoPaymentProvider> logger)
    {
        var config = options.Value;
        _sdkOptions = new IyzicoOptionsModel
        {
            ApiKey = config.ApiKey,
            SecretKey = config.SecretKey,
            BaseUrl = config.BaseUrl,
        };
        _pricingPlanReferenceCode = config.PremiumPricingPlanReferenceCode;
        _logger = logger;
    }

    public async Task<CheckoutInitializationResult> InitializeSubscriptionCheckoutAsync(SubscriptionCheckoutRequest request, CancellationToken cancellationToken = default)
    {
        var iyzicoRequest = new InitializeCheckoutFormRequest
        {
            Locale = "tr",
            ConversationId = request.ConversationId,
            CallbackUrl = request.CallbackUrl,
            PricingPlanReferenceCode = _pricingPlanReferenceCode,
            Customer = new CheckoutFormCustomer
            {
                Name = request.Buyer.Name,
                Surname = request.Buyer.Surname,
                Email = request.CustomerEmail,
                GsmNumber = request.Buyer.GsmNumber,
                IdentityNumber = request.Buyer.IdentityNumber,
                BillingAddress = new Address
                {
                    ContactName = $"{request.Buyer.Name} {request.Buyer.Surname}",
                    City = request.Buyer.City,
                    Country = "Turkey",
                    Description = request.Buyer.AddressLine,
                    ZipCode = "00000",
                },
            },
        };

        var resource = await Task.Run(
            () => IyzicoSubscription.InitializeCheckoutForm(iyzicoRequest, _sdkOptions),
            cancellationToken);

        if (resource.Status != "success")
        {
            _logger.LogWarning(
                "Iyzico checkout initialization failed. ConversationId={ConversationId} ErrorCode={ErrorCode}",
                request.ConversationId, resource.ErrorCode);
            return new CheckoutInitializationResult(false, null, null, resource.ErrorMessage ?? "Ödeme başlatılamadı.");
        }

        return new CheckoutInitializationResult(true, resource.Token, resource.CheckoutFormContent, null);
    }

    public async Task<SubscriptionCheckoutResult> GetCheckoutFormResultAsync(string token, CancellationToken cancellationToken = default)
    {
        var request = new GetCheckoutFormResultRequest { Locale = "tr", Token = token };

        var response = await Task.Run(
            () => IyzicoSubscription.GetCheckoutFormResult(request, _sdkOptions),
            cancellationToken);

        if (response.Status != "success" || response.Data is null)
        {
            _logger.LogWarning("Iyzico checkout form result retrieval failed. ErrorCode={ErrorCode}", response.ErrorCode);
            return new SubscriptionCheckoutResult(false, null, null, null, response.ErrorMessage ?? "Ödeme sonucu alınamadı.");
        }

        var data = response.Data;
        return new SubscriptionCheckoutResult(true, data.ReferenceCode, data.CustomerReferenceCode, data.SubscriptionStatus, null);
    }

    public async Task<ProviderSubscriptionState> RetrieveSubscriptionStatusAsync(string subscriptionReferenceCode, CancellationToken cancellationToken = default)
    {
        var request = new RetrieveSubscriptionRequest { Locale = "tr", SubscriptionReferenceCode = subscriptionReferenceCode };

        var response = await Task.Run(
            () => IyzicoSubscription.Retrieve(request, _sdkOptions),
            cancellationToken);

        if (response.Status != "success" || response.Data is null)
        {
            _logger.LogWarning(
                "Iyzico subscription retrieve failed. SubscriptionReferenceCode={SubscriptionReferenceCode} ErrorCode={ErrorCode}",
                subscriptionReferenceCode, response.ErrorCode);
            return new ProviderSubscriptionState(false, null, response.ErrorMessage ?? "Abonelik durumu alınamadı.");
        }

        return new ProviderSubscriptionState(true, response.Data.SubscriptionStatus, null);
    }

    public async Task<bool> CancelSubscriptionAsync(string subscriptionReferenceCode, CancellationToken cancellationToken = default)
    {
        var request = new CancelSubscriptionRequest { Locale = "tr", SubscriptionReferenceCode = subscriptionReferenceCode };

        var resource = await Task.Run(
            () => IyzicoSubscription.Cancel(request, _sdkOptions),
            cancellationToken);

        if (resource.Status != "success")
        {
            _logger.LogWarning(
                "Iyzico subscription cancellation failed. SubscriptionReferenceCode={SubscriptionReferenceCode} ErrorCode={ErrorCode}",
                subscriptionReferenceCode, resource.ErrorCode);
            return false;
        }

        return true;
    }
}
