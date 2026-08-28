namespace CvAnalyzer.Api.Services.AI;

/// <summary>
/// Bound from the "AI" configuration section. ApiKey must never come from appsettings.json in
/// source control — see appsettings.json's placeholder and the project README for how to set
/// it via user-secrets (Development) or an environment variable (other environments).
/// </summary>
public class AiOptions
{
    public const string SectionName = "AI";

    public string Provider { get; set; } = "Anthropic";

    public string Model { get; set; } = "claude-opus-5";

    public string? ApiKey { get; set; }

    /// <summary>Upper bound on the AI response's token count — a direct cost control lever.</summary>
    public int MaxTokens { get; set; } = 4000;

    /// <summary>
    /// Left unset by default. Current-generation Claude models (Opus 5, Sonnet 5, Fable 5)
    /// reject sampling parameters outright (400) since thinking is always on for them — only
    /// set this if pointing the "Model" setting at an older model that still accepts it.
    /// </summary>
    public double? Temperature { get; set; }

    /// <summary>
    /// Character cap applied to CV text before it is sent to the AI provider — the main cost
    /// control knob for oversized documents. See <see cref="CvTextNormalizer"/>.
    /// </summary>
    public int MaxInputCharacters { get; set; } = 20_000;
}
