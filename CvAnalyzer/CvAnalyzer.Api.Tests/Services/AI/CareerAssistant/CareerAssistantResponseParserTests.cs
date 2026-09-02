using CvAnalyzer.Api.Services.AI;
using CvAnalyzer.Api.Services.AI.CareerAssistant;
using Microsoft.Extensions.Logging.Abstractions;

namespace CvAnalyzer.Api.Tests.Services.AI.CareerAssistant;

public class CareerAssistantResponseParserTests
{
    private static readonly CareerAssistantResponseParser Sut = new(NullLogger<CareerAssistantResponseParser>.Instance);

    // ---------- JobMatch ----------

    [Fact]
    public void ParseJobMatch_ValidJson_ReturnsClampedResult()
    {
        var result = Sut.ParseJobMatch("""
            {"overallScore": 150, "skillsScore": -10, "experienceScore": 70, "keywordsScore": 80, "educationScore": 90,
             "summary": "Good fit.", "requiredSkills": ["C#"], "preferredSkills": [], "matchedSkills": ["C#"],
             "missingSkills": [], "strengths": ["Relevant experience"], "gaps": [], "suggestedCvChanges": []}
            """);

        Assert.Equal(100, result.OverallScore); // clamped from 150
        Assert.Equal(0, result.SkillsScore); // clamped from -10
        Assert.Equal("Good fit.", result.Summary);
        Assert.Single(result.MatchedSkills);
    }

    [Fact]
    public void ParseJobMatch_WrappedInCodeFence_StripsTheFence()
    {
        var result = Sut.ParseJobMatch("""
            ```json
            {"overallScore": 60, "skillsScore": 60, "experienceScore": 60, "keywordsScore": 60, "educationScore": 60,
             "summary": "ok", "requiredSkills": [], "preferredSkills": [], "matchedSkills": [], "missingSkills": [],
             "strengths": ["x"], "gaps": [], "suggestedCvChanges": []}
            ```
            """);

        Assert.Equal(60, result.OverallScore);
    }

    [Fact]
    public void ParseJobMatch_EmptyResponse_Throws()
    {
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseJobMatch(""));
    }

    [Fact]
    public void ParseJobMatch_InvalidJson_Throws()
    {
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseJobMatch("not json at all"));
    }

    [Fact]
    public void ParseJobMatch_EffectivelyEmptySchema_Throws()
    {
        // Valid JSON, but every meaningful field is empty/zero — same "looks like {} " guard
        // CvAnalysisResponseParser already applies to the base analysis.
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseJobMatch("{}"));
    }

    // ---------- AtsAnalysis ----------

    [Fact]
    public void ParseAtsAnalysis_ValidJson_ReturnsClampedResult()
    {
        var result = Sut.ParseAtsAnalysis("""
            {"atsScore": 87, "structureScore": 90, "keywordUsageScore": 80, "formattingScore": 200, "readabilityScore": 85,
             "summary": "Mostly ATS-friendly.", "strengths": ["Clear sections"], "risks": ["Uses a two-column layout"], "recommendations": []}
            """);

        Assert.Equal(87, result.AtsScore);
        Assert.Equal(100, result.FormattingScore); // clamped from 200
        Assert.Single(result.Risks);
    }

    [Fact]
    public void ParseAtsAnalysis_EffectivelyEmptySchema_Throws()
    {
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseAtsAnalysis("{}"));
    }

    // ---------- CvRewrite ----------

    [Fact]
    public void ParseCvRewrite_ValidJson_ReturnsSuggestions()
    {
        var result = Sut.ParseCvRewrite("""
            {"summary": "A few phrasing improvements.", "suggestions": [
              {"section": "experience", "original": "Made a website.", "improved": "Built and shipped a customer-facing web application.", "reason": "More specific and outcome-oriented."}
            ]}
            """);

        var suggestion = Assert.Single(result.Suggestions);
        Assert.Equal("experience", suggestion.Section);
        Assert.Equal("Made a website.", suggestion.Original);
    }

    [Fact]
    public void ParseCvRewrite_NoSuggestionsAndNoSummary_Throws()
    {
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseCvRewrite("""{"summary": "", "suggestions": []}"""));
    }

    [Fact]
    public void ParseCvRewrite_EmptySuggestionsButNonEmptySummary_IsValid()
    {
        // A CV with no weak sentences is a legitimate "zero suggestions" outcome, as long as
        // the AI still explains why (see CvRewriteSystemPrompt).
        var result = Sut.ParseCvRewrite("""{"summary": "This CV is already well-written; no changes suggested.", "suggestions": []}""");

        Assert.Empty(result.Suggestions);
        Assert.NotEmpty(result.Summary);
    }

    // ---------- CareerRecommendations ----------

    [Fact]
    public void ParseCareerRecommendations_ValidJson_ClampsMatchPercentage()
    {
        var result = Sut.ParseCareerRecommendations("""
            {"summary": "Backend-leaning profile.", "recommendations": [
              {"role": "Junior Backend Developer", "matchPercentage": 130, "reasoning": "Strong C# and SQL experience."}
            ]}
            """);

        var rec = Assert.Single(result.Recommendations);
        Assert.Equal(100, rec.MatchPercentage); // clamped from 130
        Assert.Equal("Junior Backend Developer", rec.Role);
    }

    [Fact]
    public void ParseCareerRecommendations_EffectivelyEmptySchema_Throws()
    {
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseCareerRecommendations("{}"));
    }

    // ---------- CoverLetter ----------

    [Fact]
    public void ParseCoverLetter_ValidJson_ReturnsText()
    {
        var result = Sut.ParseCoverLetter("""{"coverLetterText": "Dear Hiring Manager, ..."}""");

        Assert.StartsWith("Dear Hiring Manager", result.CoverLetterText);
    }

    [Fact]
    public void ParseCoverLetter_EmptyText_Throws()
    {
        Assert.Throws<AiResponseParsingException>(() => Sut.ParseCoverLetter("""{"coverLetterText": ""}"""));
    }
}
