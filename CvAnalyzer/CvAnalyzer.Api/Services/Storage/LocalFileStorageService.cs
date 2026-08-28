namespace CvAnalyzer.Api.Services.Storage;

/// <summary>
/// Stores files on local disk, outside any web-servable directory (there is no wwwroot/static
/// file middleware in this API, and the configured root additionally lives outside the project
/// folder by default), under server-generated file names to avoid collisions and path traversal.
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly string _rootPath;

    public LocalFileStorageService(IHostEnvironment environment, IConfiguration configuration)
    {
        var configuredPath = configuration["FileStorage:RootPath"] ?? "../storage/cv-uploads";
        _rootPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, configuredPath));
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<string> SaveAsync(Stream content, string fileExtension, CancellationToken cancellationToken = default)
    {
        var storageKey = $"{Guid.NewGuid():N}{fileExtension}";
        var fullPath = Path.Combine(_rootPath, storageKey);

        await using var fileStream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write);
        await content.CopyToAsync(fileStream, cancellationToken);

        return storageKey;
    }

    public async Task<byte[]> ReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_rootPath, storageKey);

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("Stored file was not found.", fullPath);
        }

        return await File.ReadAllBytesAsync(fullPath, cancellationToken);
    }

    public Task DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_rootPath, storageKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }
}
