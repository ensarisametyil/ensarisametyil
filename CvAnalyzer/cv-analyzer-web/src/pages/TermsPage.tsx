import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import { useTranslation } from '../hooks/useTranslation'
import styles from './LegalPage.module.css'

function TermsPage() {
  const { t, tList } = useTranslation()

  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>{t('legal.terms.title')}</h1>
        <p className={styles.updatedAt}>{t('legal.updatedAt')}</p>

        <p>{t('legal.terms.intro')}</p>

        <h2>{t('legal.terms.section1Heading')}</h2>
        <p>{t('legal.terms.section1Body')}</p>

        <h2>{t('legal.terms.section2Heading')}</h2>
        <ul>
          {tList('legal.terms.section2Items').map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t('legal.terms.section3Heading')}</h2>
        <p>{t('legal.terms.section3Body')}</p>

        <h2>{t('legal.terms.section4Heading')}</h2>
        <ul>
          {tList('legal.terms.section4Items').map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t('legal.terms.section5Heading')}</h2>
        <p>{t('legal.terms.section5Body')}</p>

        <h2>{t('legal.terms.section6Heading')}</h2>
        <p>{t('legal.terms.section6Body')}</p>

        <p className={styles.disclaimer}>{t('legal.disclaimer')}</p>
      </main>
      <Footer />
    </div>
  )
}

export default TermsPage
