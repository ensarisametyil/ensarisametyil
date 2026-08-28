using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;

namespace CvAnalyzer.Api.Services.FileProcessing;

public class FileParserService : IFileParserService
{
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
}
