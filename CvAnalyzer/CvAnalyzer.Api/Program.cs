using System.Text;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.Auth;
using CvAnalyzer.Api.Services.Billing;
using CvAnalyzer.Api.Services.Billing.Payments;
using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Services.Storage;
using CvAnalyzer.Api.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var bearerScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT access token (without the 'Bearer ' prefix).",
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
    };
    options.AddSecurityDefinition("Bearer", bearerScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement { [bearerScheme] = Array.Empty<string>() });
});

builder.Services.AddFrontendCors(builder.Configuration);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is not configured. " +
        "Set it via 'dotnet user-secrets set ConnectionStrings:DefaultConnection \"...\"' in Development, " +
        "or the ConnectionStrings__DefaultConnection environment variable in other environments.");
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
builder.Services.AddSingleton<ICvFileValidator, CvFileValidator>();
builder.Services.AddSingleton<IFileParserService, FileParserService>();

builder.Services.Configure<AiOptions>(builder.Configuration.GetSection(AiOptions.SectionName));
builder.Services.AddSingleton<ICvTextNormalizer, CvTextNormalizer>();
builder.Services.AddSingleton<IAnthropicMessagesGateway, AnthropicMessagesGateway>();
builder.Services.AddSingleton<ICvAnalysisResponseParser, CvAnalysisResponseParser>();
builder.Services.AddSingleton<IAiCvAnalysisService, AnthropicCvAnalysisService>();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.Configure<PlanOptions>(builder.Configuration.GetSection(PlanOptions.SectionName));
builder.Services.AddSingleton<IPlanCatalog, PlanCatalog>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IFeatureEntitlementService, FeatureEntitlementService>();
builder.Services.AddSingleton<IUserOperationLock, UserOperationLock>();
builder.Services.AddScoped<IAnalysisQuotaService, AnalysisQuotaService>();

builder.Services.Configure<IyzicoOptions>(builder.Configuration.GetSection(IyzicoOptions.SectionName));
builder.Services.AddSingleton<IPaymentProvider, IyzicoPaymentProvider>();
builder.Services.AddSingleton<IIyzicoWebhookSignatureVerifier, IyzicoWebhookSignatureVerifier>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

// --- Authentication (JWT) ---

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IPasswordPolicy, PasswordPolicy>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

// Fail fast if the signing key is missing — checked eagerly here so misconfiguration is caught
// at startup, but the value actually baked into TokenValidationParameters below is re-read lazily
// from builder.Configuration inside the AddJwtBearer callback, so it reflects the fully-merged
// configuration (including any overrides layered on after this point, e.g. by test hosts).
if (string.IsNullOrWhiteSpace(builder.Configuration[$"{JwtOptions.SectionName}:SigningKey"]))
{
    throw new InvalidOperationException(
        "JWT signing key 'Jwt:SigningKey' is not configured. " +
        "Set it via 'dotnet user-secrets set Jwt:SigningKey \"...\"' in Development, " +
        "or the Jwt__SigningKey environment variable in other environments.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep claim types exactly as issued ("sub", "email") instead of ASP.NET Core's
        // default remapping to long ClaimTypes.* URIs — simpler, more predictable claim reads.
        options.MapInboundClaims = false;

        // Read live from configuration here (not from a pre-computed outer variable) so this
        // reflects the final merged configuration, including any test-host overrides applied
        // after this point in the pipeline (e.g. WebApplicationFactory.ConfigureAppConfiguration).
        var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["SigningKey"]!)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionFeature = context.Features.Get<IExceptionHandlerFeature>();
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(exceptionFeature?.Error, "Unhandled exception while processing {Path}", context.Request.Path);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(
            new ErrorResponseDto("INTERNAL_SERVER_ERROR", "Beklenmeyen bir sunucu hatası oluştu."));
    });
});

// Reject oversized uploads by Content-Length *before* the body is read/buffered by
// model binding. Relying on [RequestFormLimits] instead would still work, but ASP.NET
// Core's multipart form reader turns that failure into a 400 ValidationProblem rather
// than a 413, which isn't the status code we want to hand back to API clients.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api/cv/upload") &&
        context.Request.ContentLength is { } contentLength &&
        contentLength > CvUploadPolicy.MaxFileSizeBytes)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
        await context.Response.WriteAsJsonAsync(
            new ErrorResponseDto("FILE_TOO_LARGE", "Dosya boyutu 10 MB sınırını aşıyor."));
        return;
    }

    await next();
});

app.UseHttpsRedirection();

app.UseCors(FrontendCorsExtensions.FrontendPolicyName);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Exposes the top-level-statement Program class (internal by default) to
// Microsoft.AspNetCore.Mvc.Testing's WebApplicationFactory<Program> in the test project.
public partial class Program
{
}
