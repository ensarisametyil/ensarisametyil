namespace CvAnalyzer.Api.Models.Dtos.Auth;

public record ChangePasswordRequestDto(string CurrentPassword, string NewPassword);
