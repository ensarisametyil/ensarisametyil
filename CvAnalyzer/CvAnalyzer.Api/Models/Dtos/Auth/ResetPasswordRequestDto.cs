namespace CvAnalyzer.Api.Models.Dtos.Auth;

public record ResetPasswordRequestDto(string Token, string NewPassword);
