namespace CvAnalyzer.Api.Models.Dtos.CareerAssistant;

/// <summary>Locale is one of "tr"/"en"/"de" (matches CVora AI's three supported languages, see docs/email.md's EmailCopyCatalog for the same convention); an unrecognized/missing value falls back to Turkish.</summary>
public record CoverLetterRequestDto(Guid CvId, string JobDescription, string? Locale);
