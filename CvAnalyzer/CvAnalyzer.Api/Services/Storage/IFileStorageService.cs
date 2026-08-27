namespace CvAnalyzer.Api.Services.Storage;

public interface IFileStorageService
{
    /// <summary>
    /// Persists the given content and returns a storage key that can later be used
    /// to locate the file. The key is provider-specific (a relative path for local
    /// disk storage, an object key for S3/Blob, etc.) and is what gets saved on the
    /// Cv entity — never an absolute filesystem path.
    /// </summary>
    Task<string> SaveAsync(Stream content, string fileExtension, CancellationToken cancellationToken = default);
}
