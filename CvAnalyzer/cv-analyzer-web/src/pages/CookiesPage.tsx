import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import { useTranslation } from '../hooks/useTranslation'
import styles from './LegalPage.module.css'

function CookiesPage() {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>{t('legal.cookies.title')}</h1>
        <p className={styles.updatedAt}>{t('legal.updatedAt')}</p>

        <p>{t('legal.cookies.intro')}</p>

        <h2>{t('legal.cookies.section1Heading')}</h2>
        <ul>
          <li>
            <strong>{t('legal.cookies.section1ItemLabel')}</strong> {t('legal.cookies.section1ItemBody')}
          </li>
        </ul>
        <p>{t('legal.cookies.section1Note')}</p>

        <h2>{t('legal.cookies.section2Heading')}</h2>
        <p>{t('legal.cookies.section2Body')}</p>

        <p className={styles.disclaimer}>{t('legal.disclaimerShort')}</p>
      </main>
      <Footer />
    </div>
  )
}

export default CookiesPage
