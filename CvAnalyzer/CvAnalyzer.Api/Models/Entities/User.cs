namespace CvAnalyzer.Api.Models.Entities;

public class User
{
    public Guid Id { get; set; }

    /// <summary>Always stored normalized (trimmed + lowercased) — see AuthService.NormalizeEmail.</summary>
    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string? FullName { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ICollection<Cv> Cvs { get; set; } = new List<Cv>();

    public ICollection<Analysis> Analyses { get; set; } = new List<Analysis>();

    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();

    public ICollection<AnalysisUsage> AnalysisUsages { get; set; } = new List<AnalysisUsage>();

    public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
}
