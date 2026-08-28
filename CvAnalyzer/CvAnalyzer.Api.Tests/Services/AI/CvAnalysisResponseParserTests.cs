using CvAnalyzer.Api.Services.AI;
using Microsoft.Extensions.Logging.Abstractions;

namespace CvAnalyzer.Api.Tests.Services.AI;

public class CvAnalysisResponseParserTests
{
    private readonly CvAnalysisResponseParser _sut = new(NullLogger<CvAnalysisResponseParser>.Instance);

    [Fact]
    public void Parse_ValidJson_DeserializesAllFieldsCorrectly()
    {
        const string json = """
            {
              "overallScore": 88,
              "summary": "Strong CV overall.",
              "strengths": ["Good structure", "Relevant skills"],
              "weaknesses": ["No metrics"],
              "skills": ["C#", "SQL"],
              "experience": "4 years as a developer.",
              "education": "BSc Computer Science.",
              "missingKeywords": ["Docker"],
              "recommendations": ["Add measurable results."]
            }
            """;

        var result = _sut.Parse(json);

        Assert.Equal(88, result.OverallScore);
        Assert.Equal("Strong CV overall.", result.Summary);
        Assert.Equal(["Good structure", "Relevant skills"], result.Strengths);
        Assert.Equal(["No metrics"], result.Weaknesses);
        Assert.Equal(["C#", "SQL"], result.Skills);
        Assert.Equal("4 years as a developer.", result.Experience);
        Assert.Equal("BSc Computer Science.", result.Education);
        Assert.Equal(["Docker"], result.MissingKeywords);
        Assert.Equal(["Add measurable results."], result.Recommendations);
    }

    [Fact]
    public void Parse_JsonWrappedInMarkdownCodeFence_StillParses()
    {
        const string wrapped = """
            ```json
            { "overallScore": 60, "summary": "Ok CV.", "strengths": [], "weaknesses": [], "skills": [], "experience": "", "education": "", "missingKeywords": [], "recommendations": [] }
            ```
            """;

        var result = _sut.Parse(wrapped);

        Assert.Equal(60, result.OverallScore);
        Assert.Equal("Ok CV.", result.Summary);
    }

    [Fact]
    public void Parse_ScoreOutOfRange_IsClampedTo0To100()
    {
        const string json = """
            { "overallScore": 150, "summary": "x", "strengths": [], "weaknesses": [], "skills": [], "experience": "", "education": "", "missingKeywords": [], "recommendations": [] }
            """;

        var result = _sut.Parse(json);

        Assert.Equal(100, result.OverallScore);
    }

    [Fact]
    public void Parse_InvalidJson_ThrowsAiResponseParsingException()
    {
        const string notJson = "This is not JSON at all, sorry!";

        var ex = Assert.Throws<AiResponseParsingException>(() => _sut.Parse(notJson));
        Assert.Contains("valid JSON", ex.Message);
    }

    [Fact]
    public void Parse_EmptyResponseText_ThrowsAiResponseParsingException()
    {
        Assert.Throws<AiResponseParsingException>(() => _sut.Parse(""));
        Assert.Throws<AiResponseParsingException>(() => _sut.Parse("   "));
    }

    [Fact]
    public void Parse_WellFormedButEmptySchema_ThrowsAiResponseParsingException()
    {
        // Valid JSON, but an empty object doesn't look like a real analysis — this is the
        // "unexpected schema" case: parsing succeeds, the *contract* doesn't hold.
        const string emptyObject = "{}";

        var ex = Assert.Throws<AiResponseParsingException>(() => _sut.Parse(emptyObject));
        Assert.Contains("schema", ex.Message);
    }
}
