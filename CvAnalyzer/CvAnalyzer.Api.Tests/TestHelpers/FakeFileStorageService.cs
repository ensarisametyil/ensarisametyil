using CvAnalyzer.Api.Services.Storage;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>In-memory stand-in for <see cref="IFileStorageService"/> — no disk I/O, fully isolated per test.</summary>
public class FakeFileStorageService : IFileStorageService
{
    private readonly Dictionary<string, byte[]> _files = new();

    /// <summary>Pre-populates a "stored" file and returns the storage key the caller should reference.</summary>
    public string Seed(byte[] content, string extension)
    {
        var key = $"{Guid.NewGuid():N}{extension}";
        _files[key] = content;
        return key;
    }

    public Task<string> SaveAsync(Stream content, string fileExtension, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        content.CopyTo(ms);

        var key = $"{Guid.NewGuid():N}{fileExtension}";
        _files[key] = ms.ToArray();
        return Task.FromResult(key);
    }

    public Task<byte[]> ReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        if (!_files.TryGetValue(storageKey, out var bytes))
        {
            throw new FileNotFoundException("Stored file was not found.", storageKey);
        }

        return Task.FromResult(bytes);
    }
}
