namespace CvAnalyzer.Api.Models.Dtos.Auth;

public record AuthResponseDto(string AccessToken, string TokenType, int ExpiresInSeconds, UserDto User);
