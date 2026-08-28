namespace CvAnalyzer.Api.Models.Dtos.Auth;

/// <summary>Safe, public-facing user projection — PasswordHash never appears here or anywhere else in a response.</summary>
public record UserDto(Guid Id, string Email, DateTime CreatedAt);
