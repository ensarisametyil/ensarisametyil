namespace CvAnalyzer.Api.Models.Dtos.Auth;

/// <summary>Safe, public-facing user projection — PasswordHash never appears here or anywhere else in a response. Role (Stage 16) is what the frontend uses to show/hide the Admin nav link — the actual authorization decision is always re-checked server-side per-request, never trusted from this alone.</summary>
public record UserDto(Guid Id, string Email, DateTime CreatedAt, DateTime? EmailVerifiedAt, string Role);
