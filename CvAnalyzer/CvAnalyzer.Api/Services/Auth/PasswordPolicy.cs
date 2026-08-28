namespace CvAnalyzer.Api.Services.Auth;

/// <summary>
/// Baseline password rules: minimum length plus a mix of letters and digits. Deliberately not
/// stricter than this (no forced special characters/uppercase) — length is the strongest
/// practical lever, and overly strict composition rules mostly just push users toward
/// predictable substitutions without meaningfully improving security.
/// </summary>
public class PasswordPolicy : IPasswordPolicy
{
    public const int MinimumLength = 8;

    public string? Validate(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinimumLength)
        {
            return $"Parola en az {MinimumLength} karakter olmalı.";
        }

        if (!password.Any(char.IsLetter))
        {
            return "Parola en az bir harf içermeli.";
        }

        if (!password.Any(char.IsDigit))
        {
            return "Parola en az bir rakam içermeli.";
        }

        return null;
    }
}
