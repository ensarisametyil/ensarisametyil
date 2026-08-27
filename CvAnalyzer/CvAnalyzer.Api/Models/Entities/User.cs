namespace CvAnalyzer.Api.Models.Entities;

public class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string? FullName { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<Cv> Cvs { get; set; } = new List<Cv>();
}
