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

    /// <summary>
    /// Reads back the bytes for a previously saved file by its storage key. Throws
    /// <see cref="FileNotFoundException"/> if the key doesn't resolve to an existing file.
    /// </summary>
    Task<byte[]> ReadAsync(string storageKey, CancellationToken cancellationToken = default);

    /// <summary>Deletes a previously saved file. Idempotent — does nothing if the key no longer resolves to a file.</summary>
    Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default);
}
