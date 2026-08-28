using CvAnalyzer.Api.Models.Dtos;

namespace CvAnalyzer.Api.Services.AI;

public interface ICvAnalysisResponseParser
{
    /// <summary>
    /// Parses raw AI response text into a validated <see cref="CvAnalysisResult"/>. Throws
    /// <see cref="AiResponseParsingException"/> for an empty response, invalid JSON, or a
    /// response that doesn't match the expected schema (e.g. an all-empty/default object).
    /// </summary>
    CvAnalysisResult Parse(string rawResponseText);
}
