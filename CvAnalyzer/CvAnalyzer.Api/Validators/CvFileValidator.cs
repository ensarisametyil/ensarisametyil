using Microsoft.AspNetCore.Http;

namespace CvAnalyzer.Api.Validators;

public class CvFileValidator : ICvFileValidator
{
    // %PDF
    private static readonly byte[] PdfSignature = { 0x25, 0x50, 0x44, 0x46 };

    // DOCX is a ZIP/OOXML package, ZIP files start with "PK\3\4".
    private static readonly byte[] ZipSignature = { 0x50, 0x4B, 0x03, 0x04 };

    public CvFileValidationResult Validate(IFormFile file)
    {
        if (file.Length == 0)
        {
            return CvFileValidationResult.Failure("Yüklenen dosya boş.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!CvUploadPolicy.AllowedExtensionContentTypes.TryGetValue(extension, out var expectedContentType))
        {
            return CvFileValidationResult.Failure("Sadece PDF ve DOCX dosyaları kabul edilir.");
        }

        if (!string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
        {
            return CvFileValidationResult.Failure(
                $"Dosya içerik türü ('{file.ContentType}') beklenen '{expectedContentType}' ile uyuşmuyor.");
        }

        if (!HasExpectedSignature(file, extension))
        {
            return CvFileValidationResult.Failure("Dosya içeriği geçerli bir PDF/DOCX dosyasına ait görünmüyor.");
        }

        return CvFileValidationResult.Success();
    }

    private static bool HasExpectedSignature(IFormFile file, string extension)
    {
        var signature = extension == ".pdf" ? PdfSignature : ZipSignature;
        var buffer = new byte[signature.Length];

        using var stream = file.OpenReadStream();
        var bytesRead = stream.Read(buffer, 0, buffer.Length);
        stream.Position = 0;

        return bytesRead == signature.Length && buffer.AsSpan().SequenceEqual(signature);
    }
}
