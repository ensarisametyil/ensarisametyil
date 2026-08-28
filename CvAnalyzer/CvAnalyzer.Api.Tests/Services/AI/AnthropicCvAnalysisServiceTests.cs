using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.Extensions.Logging.Abstractions;

namespace CvAnalyzer.Api.Tests.Services.AI;

/// <summary>
/// Orchestration-level tests for <see cref="AnthropicCvAnalysisService"/>. The network boundary
/// (<see cref="IAnthropicMessagesGateway"/>) is always faked — nothing here ever calls the real
/// Claude API, so these tests run free and offline.
/// </summary>
public class AnthropicCvAnalysisServiceTests
{
    private static readonly ICvAnalysisResponseParser RealParser = new CvAnalysisResponseParser(NullLogger<CvAnalysisResponseParser>.Instance);

    [Fact]
    public async Task AnalyzeCvAsync_EmptyText_ThrowsArgumentExceptionWithoutCallingGateway()
    {
        var gateway = FakeAnthropicMessagesGateway.Throwing(new InvalidOperationException("gateway should not be called"));
        var sut = new AnthropicCvAnalysisService(gateway, RealParser);

        await Assert.ThrowsAsync<ArgumentException>(() => sut.AnalyzeCvAsync("   "));
    }

    [Fact]
    public async Task AnalyzeCvAsync_NormalCvText_IsForwardedToGatewayAndParsedResultReturned()
    {
        const string cvText = "Jane Doe - Backend Developer with 5 years of C# experience.";
        var gateway = FakeAnthropicMessagesGateway.Returning("""
            {
              "overallScore": 75,
              "summary": "Solid backend profile.",
              "strengths": ["Clear C# experience"],
              "weaknesses": [],
              "skills": ["C#"],
              "experience": "5 years backend development.",
              "education": "",
              "missingKeywords": [],
              "recommendations": []
            }
            """);
        var sut = new AnthropicCvAnalysisService(gateway, RealParser);

        var result = await sut.AnalyzeCvAsync(cvText);

        Assert.Contains(cvText, gateway.LastUserMessage);
        Assert.Equal(75, result.OverallScore);
        Assert.Equal("Solid backend profile.", result.Summary);
    }

    [Fact]
    public async Task AnalyzeCvAsync_GatewayThrowsProviderUnavailable_PropagatesControlledException()
    {
        // Simulates a network timeout: AnthropicMessagesGateway maps SDK/timeout failures to
        // AiProviderUnavailableException, so the orchestration layer must let it through
        // unchanged rather than swallowing it or turning it into something else.
        var gateway = FakeAnthropicMessagesGateway.Throwing(new AiProviderUnavailableException("The AI provider request timed out."));
        var sut = new AnthropicCvAnalysisService(gateway, RealParser);

        await Assert.ThrowsAsync<AiProviderUnavailableException>(() => sut.AnalyzeCvAsync("Some CV text"));
    }

    [Fact]
    public async Task AnalyzeCvAsync_GatewayThrowsConfigurationException_PropagatesControlledException()
    {
        var gateway = FakeAnthropicMessagesGateway.Throwing(new AiConfigurationException("API key missing."));
        var sut = new AnthropicCvAnalysisService(gateway, RealParser);

        await Assert.ThrowsAsync<AiConfigurationException>(() => sut.AnalyzeCvAsync("Some CV text"));
    }
}
