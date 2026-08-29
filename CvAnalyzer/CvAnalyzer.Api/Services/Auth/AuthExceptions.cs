namespace CvAnalyzer.Api.Services.Auth;

/// <summary>Base type for every controlled failure the auth pipeline can raise.</summary>
public abstract class AuthException : Exception
{
    protected AuthException(string message) : base(message)
    {
    }
}

public class EmailAlreadyRegisteredException : AuthException
{
    public EmailAlreadyRegisteredException() : base("Bu e-posta adresi zaten kayıtlı.")
    {
    }
}

public class WeakPasswordException : AuthException
{
    public WeakPasswordException(string reason) : base(reason)
    {
    }
}

/// <summary>
/// Thrown for both "no such user" and "wrong password" — deliberately the same exception/
/// message for both, so the API never reveals whether a given email is registered.
/// </summary>
public class InvalidCredentialsException : AuthException
{
    public InvalidCredentialsException() : base("E-posta veya parola hatalı.")
    {
    }
}

/// <summary>Distinct from <see cref="InvalidCredentialsException"/> — used only for change-password/deactivate, where the caller is already authenticated and the email is not in question, just the current password confirmation.</summary>
public class IncorrectPasswordException : AuthException
{
    public IncorrectPasswordException() : base("Mevcut parola hatalı.")
    {
    }
}

/// <summary>Covers both "no such token" and "token expired/already used" — deliberately one message/type for all three, so a caller can't distinguish an expired token from a guessed one.</summary>
public class InvalidOrExpiredTokenException : AuthException
{
    public InvalidOrExpiredTokenException() : base("Bağlantının süresi dolmuş veya geçersiz.")
    {
    }
}
