import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import styles from './LegalPage.module.css'

function CookiesPage() {
  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>Çerez Politikası</h1>
        <p className={styles.updatedAt}>Son güncelleme: Ağustos 2026</p>

        <p>
          CVora AI, oturumunuzu yönetmek için tarayıcınızın yerel depolama alanını (localStorage) kullanır.
          Bu depolama, teknik olarak çerezle aynı amaca hizmet eder: oturumunuzun açık kalmasını sağlar.
        </p>

        <h2>1. Kullandığımız Depolama</h2>
        <ul>
          <li>
            <strong>Oturum belirteci (access token):</strong> Giriş yaptığınızda tarayıcınızın
            localStorage'ında saklanır; her API isteğinde kimliğinizi doğrulamak için kullanılır. Çıkış
            yaptığınızda silinir.
          </li>
        </ul>
        <p>
          Şu anda üçüncü taraf reklam/izleme çerezi kullanmıyoruz. İyzico'nun ödeme formu kendi güvenlik ve
          dolandırıcılık önleme çerezlerini kullanabilir; bu çerezler İyzico'nun kendi gizlilik politikasına
          tabidir.
        </p>

        <h2>2. Depolamayı Nasıl Kontrol Edebilirsiniz?</h2>
        <p>
          Tarayıcı ayarlarınızdan localStorage verilerini istediğiniz zaman temizleyebilirsiniz; bu işlem
          sizi otomatik olarak oturumdan çıkaracaktır.
        </p>

        <p className={styles.disclaimer}>
          Bu metin, ürünün mevcut aşaması için hazırlanmış bir başlangıç taslağıdır ve hukuki danışmanlığın
          yerini tutmaz.
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default CookiesPage
