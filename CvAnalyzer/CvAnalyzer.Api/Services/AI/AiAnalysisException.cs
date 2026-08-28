namespace CvAnalyzer.Api.Services.AI;

/// <summary>
/// Base type for every controlled failure the AI analysis pipeline can raise. Callers
/// (the controller) should catch the specific subclasses below rather than this base type,
/// so each failure mode maps to its own HTTP status without leaking provider-specific detail.
/// </summary>
public abstract class AiAnalysisException : Exception
{
    protected AiAnalysisException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

/// <summary>AI provider is not configured (e.g. missing API key). An operator problem, not the caller's.</summary>
public class AiConfigurationException : AiAnalysisException
{
    public AiConfigurationException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

/// <summary>The provider could not be reached at all: network failure, connection timeout, DNS, 5xx/overloaded.</summary>
public class AiProviderUnavailableException : AiAnalysisException
{
    public AiProviderUnavailableException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

/// <summary>The provider responded with a rate-limit error (429).</summary>
public class AiRateLimitExceededException : AiAnalysisException
{
    public AiRateLimitExceededException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

/// <summary>
/// The provider replied successfully but the content couldn't be turned into a valid
/// <see cref="Models.Dtos.CvAnalysisResult"/>: empty response, malformed JSON, or a response
/// that doesn't match the expected schema.
/// </summary>
public class AiResponseParsingException : AiAnalysisException
{
    public AiResponseParsingException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
