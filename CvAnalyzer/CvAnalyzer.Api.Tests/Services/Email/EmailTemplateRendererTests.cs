using CvAnalyzer.Api.Services.Email;

namespace CvAnalyzer.Api.Tests.Services.Email;

public class EmailTemplateRendererTests
{
    [Fact]
    public void Render_EscapesAHeadingContainingHtml()
    {
        var (html, _) = EmailTemplateRenderer.Render(
            heading: "<script>alert(1)</script>",
            bodyHtml: "<p>safe</p>",
            bodyPlainText: "safe",
            ctaUrl: null,
            ctaLabel: null,
            footerNoteHtml: "footer",
            footerNotePlainText: "footer");

        Assert.DoesNotContain("<script>alert(1)</script>", html);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html);
    }

    [Fact]
    public void Render_EscapesACtaUrlContainingHtmlAttributeBreakoutCharacters()
    {
        // A CTA URL is an assembled value (frontend origin + a token) — this proves that even a
        // maliciously-crafted token could never break out of the href="..." attribute.
        var (html, _) = EmailTemplateRenderer.Render(
            heading: "Reset",
            bodyHtml: "<p>body</p>",
            bodyPlainText: "body",
            ctaUrl: "https://example.com/reset?token=\"><script>alert(1)</script>",
            ctaLabel: "Reset",
            footerNoteHtml: "footer",
            footerNotePlainText: "footer");

        Assert.DoesNotContain("\"><script>", html);
        Assert.Contains("&quot;&gt;&lt;script&gt;", html);
    }

    [Fact]
    public void Render_EscapesACtaLabelContainingHtml()
    {
        var (html, _) = EmailTemplateRenderer.Render(
            heading: "Reset",
            bodyHtml: "<p>body</p>",
            bodyPlainText: "body",
            ctaUrl: "https://example.com",
            ctaLabel: "<b>Click</b>",
            footerNoteHtml: "footer",
            footerNotePlainText: "footer");

        Assert.DoesNotContain("<b>Click</b>", html);
        Assert.Contains("&lt;b&gt;Click&lt;/b&gt;", html);
    }

    [Fact]
    public void Render_DoesNotDoubleEncodeTheTrustedBodyHtml()
    {
        // bodyHtml/footerNoteHtml are authored by EmailCopyCatalog, never user input — they must
        // pass through as real markup, not become visible "&lt;p&gt;" text in the recipient's inbox.
        var (html, _) = EmailTemplateRenderer.Render(
            heading: "Heading",
            bodyHtml: "<p>Hello <strong>world</strong></p>",
            bodyPlainText: "Hello world",
            ctaUrl: null,
            ctaLabel: null,
            footerNoteHtml: "<em>footer</em>",
            footerNotePlainText: "footer");

        Assert.Contains("<p>Hello <strong>world</strong></p>", html);
        Assert.Contains("<em>footer</em>", html);
    }

    [Fact]
    public void Render_OmitsTheCtaButton_WhenNoCtaUrlIsProvided()
    {
        var (html, plainText) = EmailTemplateRenderer.Render(
            heading: "Heading",
            bodyHtml: "<p>body</p>",
            bodyPlainText: "body",
            ctaUrl: null,
            ctaLabel: null,
            footerNoteHtml: "footer",
            footerNotePlainText: "footer");

        Assert.DoesNotContain("<a href=", html);
        Assert.DoesNotContain("http", plainText);
    }

    [Fact]
    public void Render_IncludesTheCtaLinkInBothHtmlAndPlainText()
    {
        var (html, plainText) = EmailTemplateRenderer.Render(
            heading: "Heading",
            bodyHtml: "<p>body</p>",
            bodyPlainText: "body",
            ctaUrl: "https://app.cvorai.example/app",
            ctaLabel: "Go to dashboard",
            footerNoteHtml: "footer",
            footerNotePlainText: "footer");

        Assert.Contains("https://app.cvorai.example/app", html);
        Assert.Contains("Go to dashboard", html);
        Assert.Contains("https://app.cvorai.example/app", plainText);
        Assert.Contains("Go to dashboard", plainText);
    }

    [Fact]
    public void Render_PlainTextNeverContainsHtmlTags()
    {
        var (_, plainText) = EmailTemplateRenderer.Render(
            heading: "Heading",
            bodyHtml: "<p>ignored for plain text</p>",
            bodyPlainText: "Plain body text.",
            ctaUrl: "https://example.com",
            ctaLabel: "Click",
            footerNoteHtml: "<em>ignored</em>",
            footerNotePlainText: "Plain footer text.");

        Assert.DoesNotContain('<', plainText);
        Assert.DoesNotContain('>', plainText);
        Assert.Contains("Plain body text.", plainText);
        Assert.Contains("Plain footer text.", plainText);
    }

    [Fact]
    public void Render_HtmlIncludesTheBrandName()
    {
        var (html, _) = EmailTemplateRenderer.Render("Heading", "<p>body</p>", "body", null, null, "footer", "footer");

        Assert.Contains("CVora AI", html);
    }
}
