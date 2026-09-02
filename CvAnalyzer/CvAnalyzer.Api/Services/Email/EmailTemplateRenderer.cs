using System.Net;

namespace CvAnalyzer.Api.Services.Email;

/// <summary>
/// The one HTML/plain-text shell every outbound email (Welcome, PasswordReset,
/// EmailVerification, and any future notification — subscription/payment/quota/CV-analysis, see
/// IEmailService's doc comment) renders through, instead of each email type hand-assembling its
/// own full HTML document. A single header/CTA-button/footer layout keeps every CVora AI email
/// looking consistent, and centralizing the composition here means there is exactly one place
/// that ever splices a dynamic value (a heading, a CTA URL/label) into HTML — so it is the one
/// place that has to get escaping right, rather than trusting every call site to remember it.
///
/// Table-based layout with inline styles is deliberate, not legacy habit: it is what actually
/// renders consistently across real-world email clients (Outlook's Word-based rendering engine in
/// particular ignores most modern CSS), and there is no external image/logo — this is a
/// development-stage, no-hosting-yet setup (see SmtpOptions' doc comment), so the CVora AI
/// wordmark is styled text, not an &lt;img&gt; pointed at a URL that doesn't exist yet.
/// </summary>
public static class EmailTemplateRenderer
{
    private const string BrandName = "CVora AI";
    private const string AccentColor = "#4f46e5";

    /// <summary>
    /// <paramref name="bodyHtml"/> and <paramref name="footerNoteHtml"/> are trusted, already-safe
    /// HTML authored by this codebase's own <see cref="EmailCopyCatalog"/> — never raw user input,
    /// so they are NOT re-escaped here (doing so would double-encode the intentional markup, e.g.
    /// turning a real &lt;p&gt; into a literal "&amp;lt;p&amp;gt;" the recipient would see as text).
    /// <paramref name="heading"/>, <paramref name="ctaUrl"/> and <paramref name="ctaLabel"/> ARE
    /// escaped here regardless of what the caller already did, as defense in depth — a CTA URL in
    /// particular is an assembled value (frontend origin + a token), not a compile-time constant.
    /// </summary>
    public static (string Html, string PlainText) Render(
        string heading,
        string bodyHtml,
        string bodyPlainText,
        string? ctaUrl,
        string? ctaLabel,
        string footerNoteHtml,
        string footerNotePlainText)
    {
        var safeHeading = WebUtility.HtmlEncode(heading);
        var safeCtaUrl = ctaUrl is null ? null : WebUtility.HtmlEncode(ctaUrl);
        var safeCtaLabel = ctaLabel is null ? null : WebUtility.HtmlEncode(ctaLabel);

        var ctaHtml = safeCtaUrl is not null && safeCtaLabel is not null
            ? $"""
               <tr>
                 <td align="center" style="padding: 8px 32px 32px;">
                   <a href="{safeCtaUrl}" style="background-color:{AccentColor}; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-weight:600; font-size:15px; display:inline-block;">{safeCtaLabel}</a>
                 </td>
               </tr>
               """
            : string.Empty;

        var html = $"""
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                      <meta charset="utf-8" />
                      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                      <title>{safeHeading}</title>
                    </head>
                    <body style="margin:0; padding:0; background-color:#f4f4f7; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7; padding: 32px 16px;">
                        <tr>
                          <td align="center">
                            <table role="presentation" width="100%" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;" cellpadding="0" cellspacing="0">
                              <tr>
                                <td style="background-color:#111827; padding:24px 32px;">
                                  <span style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.3px;">{BrandName}</span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding:32px 32px 8px;">
                                  <h1 style="margin:0 0 16px; font-size:20px; color:#111827;">{safeHeading}</h1>
                                  <div style="font-size:15px; line-height:1.6; color:#374151;">{bodyHtml}</div>
                                </td>
                              </tr>
                              {ctaHtml}
                              <tr>
                                <td style="padding:24px 32px; border-top:1px solid #e5e7eb; font-size:12px; color:#9ca3af; line-height:1.6;">
                                  {footerNoteHtml}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </body>
                    </html>
                    """;

        var textLines = new List<string> { heading, string.Empty, bodyPlainText };
        if (ctaUrl is not null && ctaLabel is not null)
        {
            textLines.Add(string.Empty);
            textLines.Add($"{ctaLabel}: {ctaUrl}");
        }
        textLines.Add(string.Empty);
        textLines.Add("---");
        textLines.Add(footerNotePlainText);
        var plainText = string.Join('\n', textLines);

        return (html, plainText);
    }
}
