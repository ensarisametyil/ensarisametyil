using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Services.AI;

public class CvTextNormalizer : ICvTextNormalizer
{
    private static readonly Regex ExcessiveBlankLines = new(@"\n{3,}", RegexOptions.Compiled);
    private static readonly Regex RepeatedInlineWhitespace = new(@"[ \t]{2,}", RegexOptions.Compiled);

    private readonly int _maxCharacters;

    public CvTextNormalizer(IOptions<AiOptions> options)
    {
        _maxCharacters = options.Value.MaxInputCharacters;
    }

    public string Normalize(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return string.Empty;
        }

        var withoutExcessiveBlankLines = ExcessiveBlankLines.Replace(rawText, "\n\n");
        var withoutRepeatedSpaces = RepeatedInlineWhitespace.Replace(withoutExcessiveBlankLines, " ");

        var trimmedLines = string.Join('\n', withoutRepeatedSpaces
            .Split('\n')
            .Select(line => line.Trim()));

        var normalized = trimmedLines.Trim();

        return normalized.Length <= _maxCharacters
            ? normalized
            : TruncateAtParagraphBoundary(normalized);
    }

    private string TruncateAtParagraphBoundary(string text)
    {
        // Cut at the last paragraph break before the limit rather than mid-sentence, so a
        // long CV loses whole trailing sections instead of an incomplete, confusing fragment.
        var truncated = text[.._maxCharacters];
        var lastParagraphBreak = truncated.LastIndexOf("\n\n", StringComparison.Ordinal);

        if (lastParagraphBreak > _maxCharacters / 2)
        {
            truncated = truncated[..lastParagraphBreak];
        }

        return truncated.TrimEnd() + "\n\n[Content truncated to stay within the analysis length limit.]";
    }
}
