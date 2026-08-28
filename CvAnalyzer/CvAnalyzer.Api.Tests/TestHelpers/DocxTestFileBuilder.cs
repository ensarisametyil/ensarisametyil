using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace CvAnalyzer.Api.Tests.TestHelpers;

/// <summary>Builds real, valid DOCX files in memory via the OpenXml SDK, one paragraph per string.</summary>
public static class DocxTestFileBuilder
{
    public static byte[] Build(params string[] paragraphs)
    {
        using var ms = new MemoryStream();

        using (var wordDocument = WordprocessingDocument.Create(ms, WordprocessingDocumentType.Document))
        {
            var mainPart = wordDocument.AddMainDocumentPart();
            mainPart.Document = new Document();
            var body = mainPart.Document.AppendChild(new Body());

            foreach (var text in paragraphs)
            {
                body.AppendChild(new Paragraph(new Run(new Text(text))));
            }

            mainPart.Document.Save();
        }

        return ms.ToArray();
    }
}
