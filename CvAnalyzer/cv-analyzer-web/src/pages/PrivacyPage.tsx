import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import styles from './LegalPage.module.css'

function PrivacyPage() {
  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>Gizlilik Politikası</h1>
        <p className={styles.updatedAt}>Son güncelleme: Ağustos 2026</p>

        <p>
          Bu Gizlilik Politikası, CVora AI ("Uygulama") kullanıcılarının kişisel verilerinin nasıl toplandığını,
          işlendiğini ve korunduğunu açıklar. CV'niz gibi belgeler hassas kişisel veriler (kimlik, iletişim,
          eğitim, iş geçmişi bilgileri) içerebileceğinden, bu belgeyi dikkatle hazırladık.
        </p>

        <h2>1. Hangi Verileri Topluyoruz?</h2>
        <ul>
          <li>Hesap bilgileri: e-posta adresi, şifrenizin geri döndürülemez (hash'lenmiş) hâli.</li>
          <li>Yüklediğiniz CV dosyası ve bu dosyadan çıkarılan metin içeriği.</li>
          <li>Yapay zekâ analiz sonuçları (puan, güçlü/zayıf yönler, öneriler vb.).</li>
          <li>
            Premium'a geçiş yaparsanız, ödeme sağlayıcısı İyzico'nun işlem sonucu ve size ait olmayan teknik
            referans kodları (kart bilgileriniz bu uygulamaya asla ulaşmaz).
          </li>
          <li>İletişim formu üzerinden bize ilettiğiniz mesajlar.</li>
        </ul>

        <h2>2. Verileri Neden İşliyoruz?</h2>
        <ul>
          <li>Hesabınızı oluşturmak ve kimliğinizi doğrulamak.</li>
          <li>CV'nizi analiz edip size sonuç sunmak.</li>
          <li>Free/Premium plan kullanım hakkınızı takip etmek.</li>
          <li>Premium ödeme sürecini yürütmek ve doğrulamak.</li>
          <li>İletişim taleplerinize yanıt vermek.</li>
        </ul>

        <h2>3. Verileriniz Kimlerle Paylaşılıyor?</h2>
        <p>
          CV içeriğiniz, analiz üretmek amacıyla yapay zekâ sağlayıcısına iletilir. Ödeme işlemleriniz İyzico
          tarafından işlenir. Verileriniz, yasal zorunluluklar dışında üçüncü taraflarla pazarlama amacıyla
          paylaşılmaz veya satılmaz.
        </p>

        <h2>4. Verileriniz Ne Kadar Süre Saklanır?</h2>
        <p>
          Hesabınız aktif olduğu sürece verileriniz saklanır. Bir CV'yi veya analizi sildiğinizde ilgili kayıt
          kalıcı olarak kaldırılır. Ödeme kayıtları, mali/idari yükümlülükler nedeniyle hesap kapatıldıktan
          sonra da saklanabilir.
        </p>

        <h2>5. Haklarınız (KVKK Kapsamında)</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında; verilerinizin işlenip
          işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını öğrenme, yurt
          içinde/dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme,
          silinmesini/yok edilmesini isteme ve itiraz etme haklarına sahipsiniz. Bu haklarınızı kullanmak için{' '}
          <a href="/contact">İletişim</a> sayfamızdan bize ulaşabilirsiniz.
        </p>

        <h2>6. Hesap Silme</h2>
        <p>
          Hesap Sayfanız üzerinden hesabınızı kapatabilirsiniz. Hesabınız kapatıldığında giriş yapamazsınız;
          CV/analiz/ödeme kayıtlarınız veri bütünlüğü ve yasal saklama yükümlülükleri nedeniyle bir süre daha
          sistemde tutulabilir.
        </p>

        <h2>7. Çerezler</h2>
        <p>
          Çerez kullanımımız hakkında bilgi için <a href="/cookies">Çerez Politikası</a> sayfamıza bakınız.
        </p>

        <p className={styles.disclaimer}>
          Bu metin, ürünün mevcut aşaması için hazırlanmış bir başlangıç taslağıdır ve hukuki danışmanlığın
          yerini tutmaz. Production'a çıkmadan önce bir hukuk danışmanı tarafından gözden geçirilmesi önerilir.
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default PrivacyPage
