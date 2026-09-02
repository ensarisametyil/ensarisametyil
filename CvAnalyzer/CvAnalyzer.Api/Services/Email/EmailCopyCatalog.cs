namespace CvAnalyzer.Api.Services.Email;

/// <summary>One rendered email's worth of copy — subject plus the pieces EmailTemplateRenderer.Render needs.</summary>
public readonly record struct EmailCopy(
    string Subject,
    string Heading,
    string BodyHtml,
    string BodyPlainText,
    string CtaLabel,
    string FooterNoteHtml,
    string FooterNotePlainText);

/// <summary>
/// The TR/EN/DE copy for every email SmtpEmailService sends — CVora AI's three supported
/// languages (see cv-analyzer-web/src/i18n/locales). This is the backend's equivalent of the
/// frontend's i18n/locales/*.json: the frontend's own locale files are TypeScript modules bundled
/// into the browser build and are not reachable from the API process, so email copy needed its
/// own, backend-owned home — but the shape deliberately mirrors the frontend's discipline (one
/// method per email "key", never a hardcoded string inline in SmtpEmailService, unrecognized/
/// missing locale falls back to Turkish exactly like DEFAULT_LOCALE does on the frontend) rather
/// than inventing a different i18n mechanism. Content only — HTML escaping happens once, in
/// EmailTemplateRenderer, not here.
/// </summary>
public static class EmailCopyCatalog
{
    /// <summary>Matches DEFAULT_LOCALE in cv-analyzer-web/src/i18n/locales/index.ts.</summary>
    public const string DefaultLocale = "tr";

    public static EmailCopy Welcome(string locale) => locale switch
    {
        "en" => new EmailCopy(
            Subject: "Welcome to CVora AI!",
            Heading: "Welcome to CVora AI!",
            BodyHtml: "<p>Your account is ready. CVora AI reads your CV with AI and gives you concrete, actionable feedback — so you can fix what's actually holding your applications back.</p>" +
                      "<p>Head to your dashboard to upload your first CV and get your free analysis.</p>",
            BodyPlainText: "Your account is ready. CVora AI reads your CV with AI and gives you concrete, actionable feedback — so you can fix what's actually holding your applications back.\n\n" +
                            "Head to your dashboard to upload your first CV and get your free analysis.",
            CtaLabel: "Go to my dashboard",
            FooterNoteHtml: "You're receiving this email because you created a CVora AI account. If this wasn't you, you can safely ignore this message.",
            FooterNotePlainText: "You're receiving this email because you created a CVora AI account. If this wasn't you, you can safely ignore this message."),

        "de" => new EmailCopy(
            Subject: "Willkommen bei CVora AI!",
            Heading: "Willkommen bei CVora AI!",
            BodyHtml: "<p>Ihr Konto ist bereit. CVora AI analysiert Ihren Lebenslauf mit KI und gibt Ihnen konkrete, umsetzbare Hinweise — damit Sie genau das verbessern, was Ihre Bewerbungen wirklich bremst.</p>" +
                      "<p>Gehen Sie zu Ihrem Dashboard, laden Sie Ihren ersten Lebenslauf hoch und erhalten Sie Ihre kostenlose Analyse.</p>",
            BodyPlainText: "Ihr Konto ist bereit. CVora AI analysiert Ihren Lebenslauf mit KI und gibt Ihnen konkrete, umsetzbare Hinweise — damit Sie genau das verbessern, was Ihre Bewerbungen wirklich bremst.\n\n" +
                            "Gehen Sie zu Ihrem Dashboard, laden Sie Ihren ersten Lebenslauf hoch und erhalten Sie Ihre kostenlose Analyse.",
            CtaLabel: "Zu meinem Dashboard",
            FooterNoteHtml: "Sie erhalten diese E-Mail, weil Sie ein CVora AI-Konto erstellt haben. Falls Sie das nicht waren, können Sie diese Nachricht einfach ignorieren.",
            FooterNotePlainText: "Sie erhalten diese E-Mail, weil Sie ein CVora AI-Konto erstellt haben. Falls Sie das nicht waren, können Sie diese Nachricht einfach ignorieren."),

        _ => new EmailCopy(
            Subject: "CVora AI'ye Hoş Geldiniz!",
            Heading: "CVora AI'ye Hoş Geldiniz!",
            BodyHtml: "<p>Hesabınız hazır. CVora AI, CV'nizi yapay zeka ile analiz eder ve başvurularınızı gerçekten neyin zorladığını görmenizi sağlayan somut, uygulanabilir geri bildirimler sunar.</p>" +
                      "<p>İlk CV'nizi yükleyip ücretsiz analizinizi almak için panelinize gidin.</p>",
            BodyPlainText: "Hesabınız hazır. CVora AI, CV'nizi yapay zeka ile analiz eder ve başvurularınızı gerçekten neyin zorladığını görmenizi sağlayan somut, uygulanabilir geri bildirimler sunar.\n\n" +
                            "İlk CV'nizi yükleyip ücretsiz analizinizi almak için panelinize gidin.",
            CtaLabel: "Panelime git",
            FooterNoteHtml: "Bu e-postayı bir CVora AI hesabı oluşturduğunuz için alıyorsunuz. Bu siz değilseniz, bu mesajı görmezden gelebilirsiniz.",
            FooterNotePlainText: "Bu e-postayı bir CVora AI hesabı oluşturduğunuz için alıyorsunuz. Bu siz değilseniz, bu mesajı görmezden gelebilirsiniz."),
    };

    public static EmailCopy PasswordReset(string locale, int validForHours) => locale switch
    {
        "en" => new EmailCopy(
            Subject: "Reset your CVora AI password",
            Heading: "Reset your password",
            BodyHtml: $"<p>We received a request to reset your CVora AI account password. Click the button below to choose a new one.</p>" +
                      $"<p>This link is valid for {validForHours} hour{(validForHours == 1 ? "" : "s")}. If you didn't request this, you can safely ignore this email — your password will not be changed.</p>",
            BodyPlainText: $"We received a request to reset your CVora AI account password. Use the link below to choose a new one.\n\n" +
                            $"This link is valid for {validForHours} hour{(validForHours == 1 ? "" : "s")}. If you didn't request this, you can safely ignore this email — your password will not be changed.",
            CtaLabel: "Reset my password",
            FooterNoteHtml: "For your security, this link can only be used once and was sent because a password reset was requested for this email address.",
            FooterNotePlainText: "For your security, this link can only be used once and was sent because a password reset was requested for this email address."),

        "de" => new EmailCopy(
            Subject: "Setzen Sie Ihr CVora AI-Passwort zurück",
            Heading: "Passwort zurücksetzen",
            BodyHtml: $"<p>Wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr CVora AI-Konto erhalten. Klicken Sie unten, um ein neues Passwort festzulegen.</p>" +
                      $"<p>Dieser Link ist {validForHours} Stunde{(validForHours == 1 ? "" : "n")} lang gültig. Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren — Ihr Passwort wird nicht geändert.</p>",
            BodyPlainText: $"Wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr CVora AI-Konto erhalten. Verwenden Sie den folgenden Link, um ein neues Passwort festzulegen.\n\n" +
                            $"Dieser Link ist {validForHours} Stunde{(validForHours == 1 ? "" : "n")} lang gültig. Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren — Ihr Passwort wird nicht geändert.",
            CtaLabel: "Passwort zurücksetzen",
            FooterNoteHtml: "Aus Sicherheitsgründen kann dieser Link nur einmal verwendet werden und wurde gesendet, weil für diese E-Mail-Adresse ein Zurücksetzen des Passworts angefordert wurde.",
            FooterNotePlainText: "Aus Sicherheitsgründen kann dieser Link nur einmal verwendet werden und wurde gesendet, weil für diese E-Mail-Adresse ein Zurücksetzen des Passworts angefordert wurde."),

        _ => new EmailCopy(
            Subject: "CVora AI parolanızı sıfırlayın",
            Heading: "Parolanızı sıfırlayın",
            BodyHtml: $"<p>CVora AI hesabınızın parolasını sıfırlama talebi aldık. Yeni bir parola belirlemek için aşağıdaki butona tıklayın.</p>" +
                      $"<p>Bu bağlantı {validForHours} saat geçerlidir. Bu talebi siz oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz — parolanız değiştirilmeyecektir.</p>",
            BodyPlainText: $"CVora AI hesabınızın parolasını sıfırlama talebi aldık. Yeni bir parola belirlemek için aşağıdaki bağlantıyı kullanın.\n\n" +
                            $"Bu bağlantı {validForHours} saat geçerlidir. Bu talebi siz oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz — parolanız değiştirilmeyecektir.",
            CtaLabel: "Parolamı sıfırla",
            FooterNoteHtml: "Güvenliğiniz için bu bağlantı yalnızca bir kez kullanılabilir ve bu e-posta adresi için bir parola sıfırlama talebi oluşturulduğu için gönderilmiştir.",
            FooterNotePlainText: "Güvenliğiniz için bu bağlantı yalnızca bir kez kullanılabilir ve bu e-posta adresi için bir parola sıfırlama talebi oluşturulduğu için gönderilmiştir."),
    };

    public static EmailCopy EmailVerification(string locale, int validForHours) => locale switch
    {
        "en" => new EmailCopy(
            Subject: "Verify your CVora AI email address",
            Heading: "Verify your email address",
            BodyHtml: $"<p>Click the button below to confirm this is your email address.</p>" +
                      $"<p>This link is valid for {validForHours} hours. If you didn't create a CVora AI account, you can safely ignore this email.</p>",
            BodyPlainText: $"Use the link below to confirm this is your email address.\n\n" +
                            $"This link is valid for {validForHours} hours. If you didn't create a CVora AI account, you can safely ignore this email.",
            CtaLabel: "Verify my email",
            FooterNoteHtml: "This link can only be used once.",
            FooterNotePlainText: "This link can only be used once."),

        "de" => new EmailCopy(
            Subject: "Bestätigen Sie Ihre CVora AI-E-Mail-Adresse",
            Heading: "E-Mail-Adresse bestätigen",
            BodyHtml: $"<p>Klicken Sie unten, um zu bestätigen, dass dies Ihre E-Mail-Adresse ist.</p>" +
                      $"<p>Dieser Link ist {validForHours} Stunden lang gültig. Wenn Sie kein CVora AI-Konto erstellt haben, können Sie diese E-Mail ignorieren.</p>",
            BodyPlainText: $"Verwenden Sie den folgenden Link, um zu bestätigen, dass dies Ihre E-Mail-Adresse ist.\n\n" +
                            $"Dieser Link ist {validForHours} Stunden lang gültig. Wenn Sie kein CVora AI-Konto erstellt haben, können Sie diese E-Mail ignorieren.",
            CtaLabel: "E-Mail bestätigen",
            FooterNoteHtml: "Dieser Link kann nur einmal verwendet werden.",
            FooterNotePlainText: "Dieser Link kann nur einmal verwendet werden."),

        _ => new EmailCopy(
            Subject: "CVora AI e-posta adresinizi doğrulayın",
            Heading: "E-posta adresinizi doğrulayın",
            BodyHtml: $"<p>Bu e-posta adresinin size ait olduğunu onaylamak için aşağıdaki butona tıklayın.</p>" +
                      $"<p>Bu bağlantı {validForHours} saat geçerlidir. Bir CVora AI hesabı oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>",
            BodyPlainText: $"Bu e-posta adresinin size ait olduğunu onaylamak için aşağıdaki bağlantıyı kullanın.\n\n" +
                            $"Bu bağlantı {validForHours} saat geçerlidir. Bir CVora AI hesabı oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.",
            CtaLabel: "E-postamı doğrula",
            FooterNoteHtml: "Bu bağlantı yalnızca bir kez kullanılabilir.",
            FooterNotePlainText: "Bu bağlantı yalnızca bir kez kullanılabilir."),
    };
}
