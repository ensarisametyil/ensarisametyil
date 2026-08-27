namespace CvAnalyzer.Api.Validators;

/// <summary>Central place for CV upload constraints so the controller, validator, and Kestrel limits agree.</summary>
public static class CvUploadPolicy
{
    public const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    public static readonly IReadOnlyDictionary<string, string> AllowedExtensionContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = "application/pdf",
            [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
}
