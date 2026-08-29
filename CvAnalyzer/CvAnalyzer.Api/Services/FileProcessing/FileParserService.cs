using System.IO.Compression;
using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;

namespace CvAnalyzer.Api.Services.FileProcessing;

public class FileParserService : IFileParserService
{
    // A DOCX is a ZIP/OOXML package. WordprocessingDocument.Open fully materializes every part it
    // reads with no size cap of its own, which makes a classic zip-bomb (a small file that
    // declares a wildly disproportionate uncompressed size) a real memory-exhaustion vector even
    // though the upload itself is already capped at CvUploadPolicy.MaxFileSizeBytes (10 MB) —
    // that cap only bounds the COMPRESSED size, not what it can decompress to. Both limits below
    // are checked from the ZIP central directory's own metadata (entry.Length), which is read
    // without decompressing anything, so this guard is itself cheap and safe to run even on a
    // maliciously crafted archive. Values are generous for a legitimate résumé (even one with a
    // few embedded images) while still closing off multi-gigabyte expansion from a 10 MB upload.
    private const long MaxDocxUncompressedBytes = 50L * 1024 * 1024; // 50 MB
    private const int MaxDocxEntryCount = 5000;

    public Task<string> ExtractTextAsync(byte[] fileBytes, string fileName)
    {
        if (fileBytes is null || fileBytes.Length == 0)
        {
            throw new InvalidOperationException("Dosya içeriği boş, metin çıkarılamaz.");
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        return extension switch
        {
            ".pdf" => Task.FromResult(ExtractPdfText(fileBytes)),
            ".docx" => Task.FromResult(ExtractDocxText(fileBytes)),
            _ => throw new NotSupportedException(
                $"Desteklenmeyen dosya türü: '{extension}'. Sadece .pdf ve .docx desteklenir.")
        };
    }

    private static string ExtractPdfText(byte[] fileBytes)
    {
        string text;
        try
        {
            using var stream = new MemoryStream(fileBytes);
            using var document = PdfDocument.Open(stream);

            var sb = new StringBuilder();
            foreach (var page in document.GetPages())
            {
                if (sb.Length > 0)
                {
                    sb.AppendLine();
                }

                sb.Append(page.Text);
            }

            text = sb.ToString().Trim();
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            throw new InvalidOperationException("PDF dosyası okunamadı; dosya bozuk olabilir.", ex);
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException(
                "PDF dosyasından metin çıkarılamadı (boş ya da taranmış/görsel bir belge olabilir).");
        }

        return text;
    }

    private static string ExtractDocxText(byte[] fileBytes)
    {
        GuardAgainstZipBomb(fileBytes);

        string text;
        try
        {
            using var stream = new MemoryStream(fileBytes);
            using var wordDocument = WordprocessingDocument.Open(stream, false);

            var body = wordDocument.MainDocumentPart?.Document?.Body;
            if (body is null)
            {
                throw new InvalidOperationException("DOCX dosyasında okunabilir içerik bulunamadı.");
            }

            // One line per paragraph so the document's structure survives the extraction
            // instead of collapsing into a single run-on line.
            var paragraphs = body.Elements<Paragraph>().Select(p => p.InnerText);
            text = string.Join(Environment.NewLine, paragraphs).Trim();
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("DOCX dosyası okunamadı; dosya bozuk olabilir.", ex);
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            throw new InvalidOperationException("DOCX dosyasından metin çıkarılamadı (boş belge olabilir).");
        }

        return text;
    }

    /// <summary>
    /// Rejects a DOCX whose ZIP central directory declares an unreasonable uncompressed size or
    /// entry count — before WordprocessingDocument.Open ever attempts to decompress anything.
    /// Deliberately lets a not-even-a-valid-zip file fall through untouched (returns rather than
    /// throwing) — that case is already handled by ExtractDocxText's own try/catch turning any
    /// OpenXml SDK failure into the same generic "file corrupt" error.
    /// </summary>
    private static void GuardAgainstZipBomb(byte[] fileBytes)
    {
        using var stream = new MemoryStream(fileBytes);

        ZipArchive archive;
        try
        {
            archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
        }
        catch (InvalidDataException)
        {
            return;
        }

        using (archive)
        {
            if (archive.Entries.Count > MaxDocxEntryCount)
            {
                throw new InvalidOperationException("DOCX dosyası beklenmedik şekilde çok sayıda iç öğe barındırıyor.");
            }

            long totalUncompressedBytes = 0;
            foreach (var entry in archive.Entries)
            {
                totalUncompressedBytes += entry.Length;
                if (totalUncompressedBytes > MaxDocxUncompressedBytes)
                {
                    throw new InvalidOperationException("DOCX dosyası beklenmedik şekilde büyük içerik barındırıyor.");
                }
            }
        }
    }
}
