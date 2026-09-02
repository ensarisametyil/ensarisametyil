using CvAnalyzer.Api.Services.Email;

namespace CvAnalyzer.Api.Tests.Services.Email;

public class EmailCopyCatalogTests
{
    [Theory]
    [InlineData("tr")]
    [InlineData("en")]
    [InlineData("de")]
    public void Welcome_EverySupportedLocale_ReturnsNonEmptyCopy(string locale)
    {
        var copy = EmailCopyCatalog.Welcome(locale);

        Assert.False(string.IsNullOrWhiteSpace(copy.Subject));
        Assert.False(string.IsNullOrWhiteSpace(copy.Heading));
        Assert.False(string.IsNullOrWhiteSpace(copy.BodyHtml));
        Assert.False(string.IsNullOrWhiteSpace(copy.BodyPlainText));
        Assert.False(string.IsNullOrWhiteSpace(copy.CtaLabel));
        Assert.False(string.IsNullOrWhiteSpace(copy.FooterNoteHtml));
        Assert.False(string.IsNullOrWhiteSpace(copy.FooterNotePlainText));
    }

    [Theory]
    [InlineData("tr")]
    [InlineData("en")]
    [InlineData("de")]
    public void PasswordReset_EverySupportedLocale_ReturnsNonEmptyCopy(string locale)
    {
        var copy = EmailCopyCatalog.PasswordReset(locale, validForHours: 1);

        Assert.False(string.IsNullOrWhiteSpace(copy.Subject));
        Assert.False(string.IsNullOrWhiteSpace(copy.BodyHtml));
        Assert.False(string.IsNullOrWhiteSpace(copy.BodyPlainText));
        Assert.False(string.IsNullOrWhiteSpace(copy.CtaLabel));
    }

    [Theory]
    [InlineData("tr")]
    [InlineData("en")]
    [InlineData("de")]
    public void EmailVerification_EverySupportedLocale_ReturnsNonEmptyCopy(string locale)
    {
        var copy = EmailCopyCatalog.EmailVerification(locale, validForHours: 24);

        Assert.False(string.IsNullOrWhiteSpace(copy.Subject));
        Assert.False(string.IsNullOrWhiteSpace(copy.BodyHtml));
        Assert.False(string.IsNullOrWhiteSpace(copy.BodyPlainText));
        Assert.False(string.IsNullOrWhiteSpace(copy.CtaLabel));
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("es")]
    [InlineData("")]
    [InlineData("xx")]
    public void Welcome_UnrecognizedLocale_FallsBackToTurkish(string unsupportedLocale)
    {
        var fallback = EmailCopyCatalog.Welcome(unsupportedLocale);
        var turkish = EmailCopyCatalog.Welcome("tr");

        Assert.Equal(turkish, fallback);
    }

    [Fact]
    public void PasswordReset_EnglishSingularHour_DoesNotSayOneHours()
    {
        var copy = EmailCopyCatalog.PasswordReset("en", validForHours: 1);

        Assert.Contains("1 hour.", copy.BodyPlainText);
        Assert.DoesNotContain("1 hours", copy.BodyPlainText);
    }

    [Fact]
    public void PasswordReset_EnglishPluralHours_SaysHoursPlural()
    {
        var copy = EmailCopyCatalog.PasswordReset("en", validForHours: 2);

        Assert.Contains("2 hours", copy.BodyPlainText);
    }

    [Fact]
    public void DefaultLocale_IsTurkish()
    {
        Assert.Equal("tr", EmailCopyCatalog.DefaultLocale);
    }
}
