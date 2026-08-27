namespace CvAnalyzer.Api.Validators;

public record CvFileValidationResult(bool IsValid, string? ErrorMessage)
{
    public static CvFileValidationResult Success() => new(true, null);

    public static CvFileValidationResult Failure(string message) => new(false, message);
}
