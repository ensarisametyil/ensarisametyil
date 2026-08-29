using CvAnalyzer.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CvAnalyzer.Api.Tests.Data;

/// <summary>
/// Proves the exact mechanism GET /health/ready relies on — DbContext.Database.CanConnectAsync()
/// — actually returns false (never throws) against an unreachable database, so the endpoint's
/// "not ready" branch is backed by real behavior rather than an untested ternary. Deliberately not
/// a full HTTP integration test: CustomWebApplicationFactory's InMemory provider always reports
/// itself reachable, so exercising the "unreachable" branch needs a real (here, real-but-refused)
/// Npgsql connection instead.
/// </summary>
public class DatabaseReadinessTests
{
    [Fact]
    public async Task CanConnectAsync_UnreachableDatabase_ReturnsFalseWithoutThrowing()
    {
        // A syntactically valid Npgsql connection string pointed at a port nothing listens on —
        // the connection attempt fails fast (connection refused) rather than timing out.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=unreachable;Username=unreachable;Password=unreachable;Timeout=2")
            .Options;
        await using var db = new AppDbContext(options);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var canConnect = await db.Database.CanConnectAsync(cts.Token);

        Assert.False(canConnect);
    }
}
