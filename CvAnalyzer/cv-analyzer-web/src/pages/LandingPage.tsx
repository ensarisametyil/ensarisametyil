import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Footer from '../components/Footer'
import PublicHeader from '../components/PublicHeader'
import styles from './LandingPage.module.css'

const FAQ_ITEMS = [
  {
    question: 'CVora AI CV\'mi nasıl analiz ediyor?',
    answer:
      'CV\'nizi yükledikten sonra yapay zekâ modeli içeriği okur; genel bir puan, güçlü/zayıf yönler, beceri listesi, eksik anahtar kelimeler ve somut öneriler üretir. CV dosyanız sadece analiz için kullanılır.',
  },
  {
    question: 'Free ve Premium arasındaki fark nedir?',
    answer: 'Free planda ayda 2 analiz hakkınız vardır. Premium planda aylık analiz sınırı yoktur.',
  },
  {
    question: 'Ödeme bilgilerim güvende mi?',
    answer:
      'Kart bilgileriniz bu uygulamaya asla ulaşmaz — ödeme İyzico\'nun kendi güvenli ödeme formu üzerinden alınır. Premium yalnızca İyzico\'dan gelen, sunucu tarafında doğrulanmış bir sonuca göre etkinleştirilir.',
  },
  {
    question: 'CV\'mi analiz ettikten sonra silebilir miyim?',
    answer: 'Evet. Analiz Geçmişim sayfanızdan her CV\'yi ve analiz sonucunu istediğiniz zaman silebilirsiniz.',
  },
]

function LandingPage() {
  const { isAuthenticated } = useAuth()
  const primaryCtaTarget = isAuthenticated ? '/app' : '/register'
  const primaryCtaLabel = isAuthenticated ? "Uygulamaya Git" : 'Ücretsiz Başla'

  return (
    <div className={styles.page}>
      <PublicHeader />

      <main>
        <section className={styles.hero}>
          <h1>CV'nizi Yapay Zekâ ile Saniyeler İçinde Analiz Edin</h1>
          <p className={styles.heroSubtitle}>
            CVora AI, CV'nizi yükler yüklemez güçlü/zayıf yönlerinizi, eksik becerilerinizi ve iyileştirme
            önerilerinizi ortaya çıkarır — başvurmadan önce CV'nizi güçlendirin.
          </p>
          <div className={styles.heroActions}>
            <Link to={primaryCtaTarget} className={styles.heroCta}>
              {primaryCtaLabel}
            </Link>
            <span className={styles.heroHint}>Kredi kartı gerekmez — Free planla hemen başlayın.</span>
          </div>
        </section>

        <section className={styles.howItWorks} aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading">Nasıl Çalışır?</h2>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3>CV'nizi yükleyin</h3>
                <p>PDF veya DOCX formatında CV'nizi yükleyin.</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3>Yapay zekâ analiz etsin</h3>
                <p>Saniyeler içinde detaylı bir CV analizi alın.</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3>Sonuçları inceleyin ve geliştirin</h3>
                <p>Puanınızı, önerilerinizi ve eksik anahtar kelimelerinizi görün.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.benefits} aria-labelledby="benefits-heading">
          <h2 id="benefits-heading">CVora AI ile Neler Kazanırsınız?</h2>
          <div className={styles.benefitGrid}>
            <div className={styles.benefitCard}>
              <h3>Objektif Değerlendirme</h3>
              <p>CV'nizi işe alım uzmanı gözüyle, tarafsız bir puanla değerlendirin.</p>
            </div>
            <div className={styles.benefitCard}>
              <h3>Somut Öneriler</h3>
              <p>Genel geçer tavsiyeler değil, CV'nize özel iyileştirme önerileri alın.</p>
            </div>
            <div className={styles.benefitCard}>
              <h3>Eksik Anahtar Kelimeler</h3>
              <p>Başvurduğunuz pozisyonlarda öne çıkmanızı sağlayacak eksik becerileri görün.</p>
            </div>
            <div className={styles.benefitCard}>
              <h3>Geçmiş Analizleriniz</h3>
              <p>Tüm analizlerinizi kaydedin, zaman içindeki gelişiminizi takip edin.</p>
            </div>
          </div>
        </section>

        <section className={styles.plans} aria-labelledby="plans-heading">
          <h2 id="plans-heading">Planlar</h2>
          <div className={styles.planGrid}>
            <div className={styles.planCard}>
              <h3>Free</h3>
              <p className={styles.planPriceNote}>Kredi kartı gerekmez</p>
              <ul>
                <li>Ayda 2 CV analizi</li>
                <li>Puan, güçlü/zayıf yönler, öneriler</li>
                <li>Analiz geçmişi</li>
              </ul>
              <Link to={isAuthenticated ? '/app' : '/register'} className={styles.planCta}>
                Ücretsiz Başla
              </Link>
            </div>
            <div className={`${styles.planCard} ${styles.planCardHighlight}`}>
              <h3>Premium</h3>
              <p className={styles.planPriceNote}>Sınırsız analiz</p>
              <ul>
                <li>Aylık sınırsız CV analizi</li>
                <li>Puan, güçlü/zayıf yönler, öneriler</li>
                <li>Analiz geçmişi</li>
                <li>Öncelikli destek</li>
              </ul>
              <Link to={isAuthenticated ? '/app' : '/register'} className={styles.planCta}>
                Premium'a Geç
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.security} aria-labelledby="security-heading">
          <h2 id="security-heading">Güvenlik ve Gizlilik</h2>
          <p>
            CV'niz kişisel ve hassas bilgiler içerebilir. CVora AI, CV içeriğinizi yalnızca analiz üretmek için
            kullanır, kimlikle doğrulanmış hesabınıza bağlı olarak saklar ve başka hiçbir kullanıcıyla paylaşmaz.
            Ödeme bilgileriniz bu uygulamaya asla ulaşmaz — İyzico'nun güvenli ödeme altyapısı üzerinden işlenir.
            Ayrıntılar için <Link to="/privacy">Gizlilik Politikası</Link> sayfamızı inceleyebilirsiniz.
          </p>
        </section>

        <section className={styles.faq} aria-labelledby="faq-heading">
          <h2 id="faq-heading">Sıkça Sorulan Sorular</h2>
          <dl>
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className={styles.faqItem}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage
