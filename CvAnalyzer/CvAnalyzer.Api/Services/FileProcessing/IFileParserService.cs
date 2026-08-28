namespace CvAnalyzer.Api.Services.FileProcessing;

public interface IFileParserService
{
    /// <summary>
    /// Extracts plain text from a PDF or DOCX file's raw bytes. The file type is inferred
    /// from <paramref name="fileName"/>'s extension. Throws <see cref="NotSupportedException"/>
    /// for any other extension and <see cref="InvalidOperationException"/> when the file is
    /// empty, corrupt, or yields no extractable text (e.g. a scanned/image-only PDF).
    /// </summary>
    Task<string> ExtractTextAsync(byte[] fileBytes, string fileName);
}
