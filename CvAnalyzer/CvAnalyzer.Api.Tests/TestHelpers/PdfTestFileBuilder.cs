using System.Text;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>
/// Builds minimal-but-structurally-valid PDF files (correct object offsets and xref table)
/// entirely in memory, so tests exercise real PdfPig parsing instead of stubs.
/// </summary>
public static class PdfTestFileBuilder
{
    public static byte[] Build(params string[] pageTexts)
    {
        if (pageTexts.Length == 0)
        {
            pageTexts = new[] { "" };
        }

        var pageCount = pageTexts.Length;
        var fontObjNum = 3 + (2 * pageCount);

        var pagesKids = string.Join(" ", Enumerable.Range(0, pageCount).Select(i => $"{3 + i} 0 R"));

        var objectBodies = new string[fontObjNum];
        objectBodies[0] = "<< /Type /Catalog /Pages 2 0 R >>";
        objectBodies[1] = $"<< /Type /Pages /Kids [{pagesKids}] /Count {pageCount} >>";

        for (var i = 0; i < pageCount; i++)
        {
            var pageObjNum = 3 + i;
            var contentObjNum = 3 + pageCount + i;
            objectBodies[pageObjNum - 1] =
                $"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
                $"/Resources << /Font << /F1 {fontObjNum} 0 R >> >> /Contents {contentObjNum} 0 R >>";
        }

        for (var i = 0; i < pageCount; i++)
        {
            var contentObjNum = 3 + pageCount + i;
            var escaped = pageTexts[i].Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
            var streamContent = $"BT /F1 12 Tf 72 700 Td ({escaped}) Tj ET";
            objectBodies[contentObjNum - 1] = $"<< /Length {streamContent.Length} >>\nstream\n{streamContent}\nendstream";
        }

        objectBodies[fontObjNum - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

        using var ms = new MemoryStream();

        void Write(string s)
        {
            var bytes = Encoding.ASCII.GetBytes(s);
            ms.Write(bytes, 0, bytes.Length);
        }

        Write("%PDF-1.4\n");

        var offsets = new long[fontObjNum + 1];
        for (var i = 0; i < fontObjNum; i++)
        {
            var objNum = i + 1;
            offsets[objNum] = ms.Position;
            Write($"{objNum} 0 obj\n{objectBodies[i]}\nendobj\n");
        }

        var xrefOffset = ms.Position;
        Write($"xref\n0 {fontObjNum + 1}\n");
        Write("0000000000 65535 f \n");
        for (var objNum = 1; objNum <= fontObjNum; objNum++)
        {
            Write($"{offsets[objNum]:D10} 00000 n \n");
        }

        Write($"trailer\n<< /Size {fontObjNum + 1} /Root 1 0 R >>\nstartxref\n{xrefOffset}\n%%EOF");

        return ms.ToArray();
    }
}
