using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Services.Billing.Payments;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CvAnalyzer.Api.Tests.Integration;

/// <summary>
/// Spins up the real app (real Program.cs, real middleware pipeline — including JWT bearer
/// authentication) with the real Npgsql DbContext swapped for an isolated InMemory one, and a
/// fixed, self-contained test signing key/connection string supplied via configuration so the
/// startup checks in Program.cs never depend on this machine's user-secrets. Used specifically
/// to test authentication/authorization behavior that a controller-level unit test can't reach,
/// since [Authorize] is enforced by middleware, not by the controller itself.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string TestJwtSigningKey = "test-only-signing-key-never-used-outside-this-test-process-0123456789";
    public const string TestJwtIssuer = "CvAnalyzer.Api.Tests";
    public const string TestJwtAudience = "CvAnalyzer.Api.Tests";
    public const string TestIyzicoSecretKey = "test-only-iyzico-secret-never-used-outside-this-test-process-0123456789";

    private readonly string _databaseName = $"AuthIntegrationTests-{Guid.NewGuid()}";

    /// <summary>Exposed so a test can configure specific results (e.g. a checkout failure) before making requests.</summary>
    public readonly FakePaymentProvider TestPaymentProvider = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=unused;Username=unused;Password=unused",
                ["Jwt:Issuer"] = TestJwtIssuer,
                ["Jwt:Audience"] = TestJwtAudience,
                ["Jwt:SigningKey"] = TestJwtSigningKey,
                ["Jwt:ExpirationMinutes"] = "60",
                ["AI:ApiKey"] = "",
                ["Iyzico:ApiKey"] = "test-api-key",
                ["Iyzico:SecretKey"] = TestIyzicoSecretKey,
                ["Iyzico:PremiumPricingPlanReferenceCode"] = "test-premium-plan",
            });
        });

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            // Never let an integration test reach the real Iyzico API.
            var paymentProviderDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IPaymentProvider));
            if (paymentProviderDescriptor is not null)
            {
                services.Remove(paymentProviderDescriptor);
            }

            services.AddSingleton<IPaymentProvider>(TestPaymentProvider);
        });
    }
}
