using CvAnalyzer.Api.Services.AI;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Fake network boundary for testing <see cref="AnthropicCvAnalysisService"/>'s orchestration without any real HTTP call.</summary>
public class FakeAnthropicMessagesGateway : IAnthropicMessagesGateway
{
    private readonly string? _responseText;
    private readonly Exception? _exceptionToThrow;

    public string? LastUserMessage { get; private set; }

    private FakeAnthropicMessagesGateway(string? responseText, Exception? exceptionToThrow)
    {
        _responseText = responseText;
        _exceptionToThrow = exceptionToThrow;
    }

    public static FakeAnthropicMessagesGateway Returning(string responseText) => new(responseText, null);

    public static FakeAnthropicMessagesGateway Throwing(Exception exception) => new(null, exception);

    public Task<string> SendAsync(string systemPrompt, string userMessage, CancellationToken cancellationToken = default)
    {
        LastUserMessage = userMessage;

        if (_exceptionToThrow is not null)
        {
            throw _exceptionToThrow;
        }

        return Task.FromResult(_responseText!);
    }
}
