using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Extensions;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Services.Storage;
using CvAnalyzer.Api.Validators;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.UseAuthorization();

app.MapControllers();

app.Run();
