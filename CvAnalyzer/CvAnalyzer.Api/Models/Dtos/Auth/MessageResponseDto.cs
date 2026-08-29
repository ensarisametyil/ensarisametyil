namespace CvAnalyzer.Api.Models.Dtos.Auth;

/// <summary>Generic, safe, user-facing confirmation message — used where the endpoint has nothing else to return (e.g. forgot-password, whose response must be identical whether or not the email is registered).</summary>
public record MessageResponseDto(string Message);
