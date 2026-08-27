namespace CvAnalyzer.Api.Models.Entities;

public class Cv
{
    public Guid Id { get; set; }

    /// <summary>
    /// Nullable until authentication exists: uploads are not yet tied to a signed-in user.
    /// </summary>
    public Guid? UserId { get; set; }

    public string FileName { get; set; } = string.Empty;

    /// <summary>Storage key/path where the raw file bytes live (local disk, S3, Blob, etc.).</summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>MIME type of the uploaded file (e.g. application/pdf), used later to pick the parser.</summary>
    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public DateTime UploadedAt { get; set; }

    public User? User { get; set; }

    public ICollection<Analysis> Analyses { get; set; } = new List<Analysis>();
}
