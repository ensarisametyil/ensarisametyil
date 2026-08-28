using CvAnalyzer.Api.Services.AI;
using Microsoft.Extensions.Options;

namespace CvAnalyzer.Api.Tests.Services.AI;

public class CvTextNormalizerTests
{
    [Fact]
    public void Normalize_ShortText_ReturnsTrimmedTextUnchanged()
    {
        var sut = CreateNormalizer(maxCharacters: 20_000);

        var result = sut.Normalize("  Jane Doe - Developer  \n");

        Assert.Equal("Jane Doe - Developer", result);
    }

    [Fact]
    public void Normalize_ExcessiveBlankLinesAndSpaces_AreCollapsed()
    {
        var sut = CreateNormalizer(maxCharacters: 20_000);

        var result = sut.Normalize("Line one\n\n\n\n\nLine two   with    spaces");

        Assert.Equal("Line one\n\nLine two with spaces", result);
    }

    [Fact]
    public void Normalize_EmptyOrWhitespaceInput_ReturnsEmptyString()
    {
        var sut = CreateNormalizer(maxCharacters: 20_000);

        Assert.Equal(string.Empty, sut.Normalize(""));
        Assert.Equal(string.Empty, sut.Normalize("   \n  "));
    }

    [Fact]
    public void Normalize_TextExceedingLimit_IsTruncatedAtParagraphBoundaryWithMarker()
    {
        // Two large paragraphs exceeding a configured limit — the normalizer must cut at the
        // paragraph boundary rather than mid-sentence, and the result must be meaningfully
        // shorter than the original (paragraph sizes are large enough that the fixed-length
        // truncation marker's own overhead can't dominate the comparison).
        var firstParagraph = new string('A', 5_000);
        var secondParagraph = new string('B', 5_000);
        var text = firstParagraph + "\n\n" + secondParagraph;

        var sut = CreateNormalizer(maxCharacters: 6_000);

        var result = sut.Normalize(text);

        Assert.Contains("[Content truncated", result);
        Assert.DoesNotContain('B', result);
        Assert.True(result.Length < text.Length);
    }

    [Fact]
    public void Normalize_VeryLongSingleParagraph_IsHardCappedNearLimit()
    {
        var text = new string('X', 100_000);
        var sut = CreateNormalizer(maxCharacters: 1_000);

        var result = sut.Normalize(text);

        // No paragraph boundary to cut at, so the result is the hard cap plus the marker —
        // it must never approach the original 100,000-character length.
        Assert.True(result.Length < 1_200);
    }

    private static CvTextNormalizer CreateNormalizer(int maxCharacters) =>
        new(Options.Create(new AiOptions { MaxInputCharacters = maxCharacters }));
}
