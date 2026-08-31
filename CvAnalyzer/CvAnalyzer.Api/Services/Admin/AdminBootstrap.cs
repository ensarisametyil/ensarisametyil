using CvAnalyzer.Api.Data;
using CvAnalyzer.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.Admin;

/// <summary>
/// Runs once at app startup (see Program.cs) to promote Admin:BootstrapEmail's account to Admin,
/// if configured and that account exists. Idempotent and safe to run on every startup: a no-op
/// once the account is already Admin, and a no-op entirely when BootstrapEmail isn't configured
/// (the default — most environments never need this, e.g. every test host). This is the only way
/// an Admin account is ever created; there is no runtime endpoint that can do it.
/// </summary>
public static class AdminBootstrap
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<AdminOptions>>().Value;
        var bootstrapEmail = options.BootstrapEmail?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(bootstrapEmail))
        {
            return;
        }

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == bootstrapEmail, cancellationToken);
        if (user is null || user.Role == UserRole.Admin)
        {
            return;
        }

        user.Role = UserRole.Admin;
        user.UpdatedAt = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(cancellationToken);
    }
}
