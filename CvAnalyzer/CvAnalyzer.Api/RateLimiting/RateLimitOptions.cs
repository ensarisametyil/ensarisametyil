namespace CvAnalyzer.Api.RateLimiting;

/// <summary>
/// Per-policy fixed-window limits for the app's costliest/most abuse-prone endpoints
/// (login/register, CV analysis, checkout, contact — see docs/stage-10.md §Rate Limiting).
/// Deliberately generous defaults: this is a speed bump against brute-force/spam/AI-cost abuse
/// for a single-instance deployment, not a production-tuned anti-abuse system. Because the
/// built-in ASP.NET Core rate limiter keeps its counters in process memory, none of this
/// survives a restart or is shared across instances — the same known limitation already
/// documented for IUserOperationLock (docs/monetization.md §4). A horizontally-scaled deployment
/// needs a distributed limiter (e.g. Redis-backed) instead; building that now would be
/// speculative complexity this stage's scope explicitly rules out.
/// </summary>
public class RateLimitOptions
{
    public const string SectionName = "RateLimiting";

    public RateLimitPolicyOptions Auth { get; set; } = new() { PermitLimit = 20, WindowSeconds = 60 };

    public RateLimitPolicyOptions Analyze { get; set; } = new() { PermitLimit = 30, WindowSeconds = 60 };

    public RateLimitPolicyOptions Checkout { get; set; } = new() { PermitLimit = 10, WindowSeconds = 60 };

    public RateLimitPolicyOptions Contact { get; set; } = new() { PermitLimit = 10, WindowSeconds = 60 };
}

public class RateLimitPolicyOptions
{
    public int PermitLimit { get; set; }

    public int WindowSeconds { get; set; }
}
