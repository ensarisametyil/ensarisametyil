namespace CvAnalyzer.Api.Models.Entities;

public class Analysis
{
    public Guid Id { get; set; }

    public Guid CvId { get; set; }

    public int Score { get; set; }

    public List<string> MissingSkills { get; set; } = new();

    public List<string> Weaknesses { get; set; } = new();

    public List<string> Suggestions { get; set; } = new();

    public List<string> JobMatches { get; set; } = new();

    /// <summary>Raw AI provider response, kept for debugging/auditing once AI analysis is wired up.</summary>
    public string? RawAiResponse { get; set; }

    public DateTime CreatedAt { get; set; }

    public Cv Cv { get; set; } = null!;
}
