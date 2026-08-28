namespace CvAnalyzer.Api.Services.Auth;

public interface IPasswordPolicy
{
    /// <summary>Returns null if the password satisfies the policy, or a user-facing reason it doesn't.</summary>
    string? Validate(string password);
}
