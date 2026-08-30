import { Link } from 'react-router-dom'
import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import { useTranslation } from '../hooks/useTranslation'
import { withLink } from '../utils/withLink'
import styles from './LegalPage.module.css'

function PrivacyPage() {
  const { t, tList } = useTranslation()

  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>{t('legal.privacy.title')}</h1>
        <p className={styles.updatedAt}>{t('legal.updatedAt')}</p>

        <p>{t('legal.privacy.intro')}</p>

        <h2>{t('legal.privacy.section1Heading')}</h2>
        <ul>
          {tList('legal.privacy.section1Items').map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t('legal.privacy.section2Heading')}</h2>
        <ul>
          {tList('legal.privacy.section2Items').map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t('legal.privacy.section3Heading')}</h2>
        <p>{t('legal.privacy.section3Body')}</p>

        <h2>{t('legal.privacy.section4Heading')}</h2>
        <p>{t('legal.privacy.section4Body')}</p>

        <h2>{t('legal.privacy.section5Heading')}</h2>
        <p>
          {withLink(
            t('legal.privacy.section5Body'),
            'contactLink',
            <Link key="contact-link" to="/contact">
              {t('footer.contact')}
            </Link>,
          )}
        </p>

        <h2>{t('legal.privacy.section6Heading')}</h2>
        <p>{t('legal.privacy.section6Body')}</p>

        <h2>{t('legal.privacy.section7Heading')}</h2>
        <p>
          {withLink(
            t('legal.privacy.section7Body'),
            'cookiesLink',
            <Link key="cookies-link" to="/cookies">
              {t('footer.cookies')}
            </Link>,
          )}
        </p>

        <p className={styles.disclaimer}>{t('legal.disclaimer')}</p>
      </main>
      <Footer />
    </div>
  )
}

export default PrivacyPage
