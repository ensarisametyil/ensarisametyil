using System.Text;
using System.Threading.RateLimiting;
using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Models.Entities;
using CvAnalyzer.Api.RateLimiting;
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

builder.Services.AddControllers(options =>
{
    // Global, not per-controller — see ActiveAccountFilter's doc comment for why every
    // authenticated request needs this, not just some.
    options.Filters.Add<CvAnalyzer.Api.Filters.ActiveAccountFilter>();
});
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

builder.Services.AddScoped<CvAnalyzer.Api.Services.Contact.IContactService, CvAnalyzer.Api.Services.Contact.ContactService>();

// --- Admin panel (Stage 16) ---

builder.Services.Configure<CvAnalyzer.Api.Services.Admin.AdminOptions>(builder.Configuration.GetSection(CvAnalyzer.Api.Services.Admin.AdminOptions.SectionName));
builder.Services.AddScoped<CvAnalyzer.Api.Services.Admin.IAdminUserService, CvAnalyzer.Api.Services.Admin.AdminUserService>();
builder.Services.AddScoped<CvAnalyzer.Api.Services.Admin.IAdminPaymentService, CvAnalyzer.Api.Services.Admin.AdminPaymentService>();
builder.Services.AddScoped<CvAnalyzer.Api.Services.Admin.IAdminDashboardService, CvAnalyzer.Api.Services.Admin.AdminDashboardService>();
builder.Services.AddScoped<CvAnalyzer.Api.Services.Admin.IAdminAuditLogService, CvAnalyzer.Api.Services.Admin.AdminAuditLogService>();

// --- Authentication (JWT) ---

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IPasswordPolicy, PasswordPolicy>();
builder.Services.AddSingleton<CvAnalyzer.Api.Services.Email.IEmailService, CvAnalyzer.Api.Services.Email.LoggingEmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

// Fail fast if the signing key is missing or too weak — checked eagerly here so misconfiguration
// is caught at startup, but the value actually baked into TokenValidationParameters below is
// re-read lazily from builder.Configuration inside the AddJwtBearer callback, so it reflects the
// fully-merged configuration (including any overrides layered on after this point, e.g. by test
// hosts). 32 UTF-8 characters is a floor, not a target — it guarantees at least the 256 bits
// HMAC-SHA256 wants (every UTF-8 code unit is >= 1 byte), rejecting an obviously-too-short key
// (e.g. a placeholder like "changeme") without pretending to fully judge the key's entropy.
const int MinimumJwtSigningKeyLength = 32;
var configuredSigningKey = builder.Configuration[$"{JwtOptions.SectionName}:SigningKey"];
if (string.IsNullOrWhiteSpace(configuredSigningKey))
{
    throw new InvalidOperationException(
        "JWT signing key 'Jwt:SigningKey' is not configured. " +
        "Set it via 'dotnet user-secrets set Jwt:SigningKey \"...\"' in Development, " +
        "or the Jwt__SigningKey environment variable in other environments.");
}
if (configuredSigningKey.Length < MinimumJwtSigningKeyLength)
{
    throw new InvalidOperationException(
        $"JWT signing key 'Jwt:SigningKey' is too short ({configuredSigningKey.Length} characters) — " +
        $"it must be at least {MinimumJwtSigningKeyLength} characters (256 bits) for HMAC-SHA256 to be " +
        "meaningfully secure. Generate a strong one, e.g. 'openssl rand -base64 48'.");
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

            // Defense-in-depth against algorithm confusion: the only key configured above is
            // symmetric, so an attacker presenting an RS256-signed token could never validate
            // against it anyway (a SymmetricSecurityKey cannot produce an asymmetric-signature
            // verifier) — but pinning the accepted algorithm explicitly, rather than relying on
            // that implicit key-type mismatch, removes any doubt and survives a future change to
            // this method that might add another key type. RequireSignedTokens (already the
            // library default) is restated explicitly so an unsigned ("alg: none") token is
            // rejected regardless of any future default change upstream.
            RequireSignedTokens = true,
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },

            // Claim types are kept as issued (see MapInboundClaims = false above), so the plain
            // "role" claim JwtTokenService writes must be pointed to explicitly — this is what
            // lets [Authorize(Roles = "Admin")] work as ASP.NET Core's built-in role check rather
            // than a bespoke policy any admin action would otherwise have to remember to apply.
            RoleClaimType = "role",
        };
    });

builder.Services.AddAuthorization();

// --- Rate limiting (built-in ASP.NET Core middleware — no extra dependency) ---
// Bound once, eagerly, at startup (same style as the Jwt signing-key check above) rather than
// resolved from DI inside each policy lambda, so the limits used are simple to reason about.
var rateLimitOptions = builder.Configuration.GetSection(RateLimitOptions.SectionName).Get<RateLimitOptions>() ?? new RateLimitOptions();

builder.Services.AddRateLimiter(options =>
{
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ErrorResponseDto("RATE_LIMITED", "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin."),
            cancellationToken);
    };

    // Unauthenticated/anonymous callers (login, register, contact) are partitioned by IP — the
    // only identity available before a JWT exists. Authenticated callers (analyze, checkout) are
    // partitioned by user id instead, so one heavy user behind a shared IP (NAT, office network)
    // never throttles a different user on the same connection.
    static string IpPartitionKey(HttpContext httpContext) =>
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    static string UserPartitionKey(HttpContext httpContext) =>
        httpContext.User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
        ?? IpPartitionKey(httpContext);

    RateLimitPartition<string> FixedWindow(string key, RateLimitPolicyOptions policy) =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = policy.PermitLimit,
            Window = TimeSpan.FromSeconds(policy.WindowSeconds),
            QueueLimit = 0,
        });

    options.AddPolicy(RateLimitPolicies.Auth, httpContext => FixedWindow(IpPartitionKey(httpContext), rateLimitOptions.Auth));
    options.AddPolicy(RateLimitPolicies.Analyze, httpContext => FixedWindow(UserPartitionKey(httpContext), rateLimitOptions.Analyze));
    options.AddPolicy(RateLimitPolicies.Checkout, httpContext => FixedWindow(UserPartitionKey(httpContext), rateLimitOptions.Checkout));
    options.AddPolicy(RateLimitPolicies.Contact, httpContext => FixedWindow(IpPartitionKey(httpContext), rateLimitOptions.Contact));
    options.AddPolicy(RateLimitPolicies.PasswordReset, httpContext => FixedWindow(IpPartitionKey(httpContext), rateLimitOptions.PasswordReset));
    options.AddPolicy(RateLimitPolicies.Account, httpContext => FixedWindow(UserPartitionKey(httpContext), rateLimitOptions.Account));
    options.AddPolicy(RateLimitPolicies.Admin, httpContext => FixedWindow(UserPartitionKey(httpContext), rateLimitOptions.Admin));
});

var app = builder.Build();

// Configure the HTTP request pipeline.

// Security response headers — registered first and via OnStarting (not a plain header
// assignment) so they are guaranteed present on EVERY response this app ever sends, including
// ones produced by the exception handler below (which re-executes an independent branch that
// bypasses the rest of this pipeline) and by 404/redirect responses. See
// Middleware/SecurityHeaders.cs for what's actually sent and why (Content-Security-Policy is
// Development-gated there, not here).
var securityHeaders = CvAnalyzer.Api.Middleware.SecurityHeaders.Build(app.Environment.IsDevelopment());
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        foreach (var (name, value) in securityHeaders)
        {
            context.Response.Headers[name] = value;
        }
        return Task.CompletedTask;
    });
    await next();
});

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

        // A BadHttpRequestException (e.g. a body over a [RequestSizeLimit]/Kestrel body-size
        // limit) already carries the correct client-facing status code — blindly rewriting every
        // exception to 500 would turn that into a misleading "internal server error" and defeat
        // the point of the size limit for any caller/monitoring reading the response status.
        if (exceptionFeature?.Error is Microsoft.AspNetCore.Http.BadHttpRequestException badRequestException)
        {
            context.Response.StatusCode = badRequestException.StatusCode;
            await context.Response.WriteAsJsonAsync(
                new ErrorResponseDto("REQUEST_TOO_LARGE", "İstek gövdesi izin verilen boyutu aşıyor."));
            return;
        }

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

// Strict-Transport-Security — tells the browser to only ever speak HTTPS to this host from now
// on, closing the window an attacker gets on a user's first plain-HTTP request/redirect. Skipped
// in Development, where the dev server usually isn't served over HTTPS at all (see
// SecurityHeaders.Build's same Development-only gating for Content-Security-Policy).
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsExtensions.FrontendPolicyName);

app.UseAuthentication();
app.UseAuthorization();

// After authentication/authorization so a per-user rate-limit policy (analyze, checkout) can read
// HttpContext.User — it has already been populated by this point in the pipeline.
app.UseRateLimiter();

// Readiness — the one thing the existing liveness check (HealthController, GET /health) doesn't
// verify: can this instance actually reach its database right now? CanConnectAsync never throws
// (it swallows the connection failure and returns false), so this never risks leaking a
// connection string or exception through the response either way.
app.MapGet("/health/ready", async (AppDbContext db, CancellationToken cancellationToken) =>
{
    var canConnect = await db.Database.CanConnectAsync(cancellationToken);
    return canConnect
        ? Results.Ok(new { status = "ready" })
        : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
});

app.MapControllers();

// Idempotent — promotes Admin:BootstrapEmail's account to Admin if configured and not already.
// The only way an Admin account is ever created; see AdminBootstrap's doc comment.
await CvAnalyzer.Api.Services.Admin.AdminBootstrap.SeedAsync(app.Services);

app.Run();

// Exposes the top-level-statement Program class (internal by default) to
// Microsoft.AspNetCore.Mvc.Testing's WebApplicationFactory<Program> in the test project.
public partial class Program
{
}
