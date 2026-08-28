using CvAnalyzer.Api.Services.FileProcessing;
using CvAnalyzer.Api.Tests.TestHelpers;

namespace CvAnalyzer.Api.Tests.Services.FileProcessing;

public class FileParserServiceTests
{
    private readonly FileParserService _sut = new();

    [Fact]
    public async Task ExtractTextAsync_ValidPdf_ReturnsExtractedText()
    {
        var pdfBytes = PdfTestFileBuilder.Build("Ada Lovelace - Software Engineer");

        var text = await _sut.ExtractTextAsync(pdfBytes, "cv.pdf");

        Assert.Contains("Ada Lovelace", text);
        Assert.Contains("Software Engineer", text);
    }

    [Fact]
    public async Task ExtractTextAsync_MultiPagePdf_ReturnsTextFromAllPagesInOrder()
    {
        var pdfBytes = PdfTestFileBuilder.Build(
            "PAGE ONE MARKER Experience",
            "PAGE TWO MARKER Education",
            "PAGE THREE MARKER Skills");

        var text = await _sut.ExtractTextAsync(pdfBytes, "cv.pdf");

        Assert.Contains("PAGE ONE MARKER", text);
        Assert.Contains("PAGE TWO MARKER", text);
        Assert.Contains("PAGE THREE MARKER", text);

        var indexOfPage1 = text.IndexOf("PAGE ONE MARKER", StringComparison.Ordinal);
        var indexOfPage2 = text.IndexOf("PAGE TWO MARKER", StringComparison.Ordinal);
        var indexOfPage3 = text.IndexOf("PAGE THREE MARKER", StringComparison.Ordinal);
        Assert.True(indexOfPage1 < indexOfPage2 && indexOfPage2 < indexOfPage3,
            "Page text should appear in page order.");
    }

    [Fact]
    public async Task ExtractTextAsync_ValidDocx_ReturnsExtractedText()
    {
        var docxBytes = DocxTestFileBuilder.Build("Grace Hopper - Backend Developer");

        var text = await _sut.ExtractTextAsync(docxBytes, "cv.docx");

        Assert.Contains("Grace Hopper", text);
        Assert.Contains("Backend Developer", text);
    }

    [Fact]
    public async Task ExtractTextAsync_MultiParagraphDocx_PreservesParagraphBoundaries()
    {
        var docxBytes = DocxTestFileBuilder.Build(
            "Summary: Experienced backend engineer.",
            "Experience: 5 years building distributed systems.",
            "Education: BSc Computer Science.");

        var text = await _sut.ExtractTextAsync(docxBytes, "cv.docx");
        var lines = text.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(3, lines.Length);
        Assert.Equal("Summary: Experienced backend engineer.", lines[0]);
        Assert.Equal("Experience: 5 years building distributed systems.", lines[1]);
        Assert.Equal("Education: BSc Computer Science.", lines[2]);
    }

    [Fact]
    public async Task ExtractTextAsync_UnsupportedExtension_ThrowsNotSupportedException()
    {
        var bytes = new byte[] { 1, 2, 3, 4 };

        await Assert.ThrowsAsync<NotSupportedException>(
            () => _sut.ExtractTextAsync(bytes, "cv.txt"));
    }

    [Fact]
    public async Task ExtractTextAsync_EmptyFile_ThrowsInvalidOperationException()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.ExtractTextAsync(Array.Empty<byte>(), "cv.pdf"));
    }

    [Fact]
    public async Task ExtractTextAsync_CorruptPdfBytes_ThrowsInvalidOperationException()
    {
        var garbage = new byte[] { 0x25, 0x50, 0x44, 0x46, 1, 2, 3, 4, 5 }; // "%PDF" header, junk after

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.ExtractTextAsync(garbage, "cv.pdf"));
    }

    [Fact]
    public async Task ExtractTextAsync_CorruptDocxBytes_ThrowsInvalidOperationException()
    {
        var garbage = new byte[] { 0x50, 0x4B, 0x03, 0x04, 1, 2, 3, 4, 5 }; // zip header, not a real docx

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.ExtractTextAsync(garbage, "cv.docx"));
    }

    [Fact]
    public async Task ExtractTextAsync_RealSamplePdfFile_ReturnsExpectedText()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "TestData", "sample.pdf");
        var bytes = await File.ReadAllBytesAsync(path);

        var text = await _sut.ExtractTextAsync(bytes, "sample.pdf");

        Assert.Contains("Sample CV", text);
    }

    [Fact]
    public async Task ExtractTextAsync_RealSampleDocxFile_ReturnsExpectedText()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "TestData", "sample.docx");
        var bytes = await File.ReadAllBytesAsync(path);

        var text = await _sut.ExtractTextAsync(bytes, "sample.docx");

        Assert.Contains("Sample CV", text);
    }
}
