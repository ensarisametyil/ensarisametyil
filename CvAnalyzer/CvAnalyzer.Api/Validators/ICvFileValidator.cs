using Microsoft.AspNetCore.Http;

namespace CvAnalyzer.Api.Validators;

public interface ICvFileValidator
{
    /// <summary>
    /// Validates extension, declared Content-Type, and the file's actual binary signature.
    /// Does not check file size — that is handled separately as a 413 response.
    /// </summary>
    CvFileValidationResult Validate(IFormFile file);
}
