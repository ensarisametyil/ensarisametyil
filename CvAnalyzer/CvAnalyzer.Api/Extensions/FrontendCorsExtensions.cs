namespace CvAnalyzer.Api.Extensions;

/// <summary>
/// Registers the CORS policy used by the React frontend during development.
/// Allowed origins are read from configuration ("Cors:AllowedOrigins") so that
/// each environment can define its own frontend URL(s) without code changes.
/// </summary>
public static class FrontendCorsExtensions
{
    public const string FrontendPolicyName = "FrontendPolicy";

    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options =>
        {
            options.AddPolicy(FrontendPolicyName, policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        return services;
    }
}
