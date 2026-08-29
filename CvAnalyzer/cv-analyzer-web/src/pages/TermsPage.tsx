import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import styles from './LegalPage.module.css'

function TermsPage() {
  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>Kullanım Şartları</h1>
        <p className={styles.updatedAt}>Son güncelleme: Ağustos 2026</p>

        <p>
          Bu Kullanım Şartları, CVora AI ("Uygulama") hizmetini kullanırken uymanız gereken kuralları
          açıklar. Uygulamayı kullanarak bu şartları kabul etmiş sayılırsınız.
        </p>

        <h2>1. Hizmetin Kapsamı</h2>
        <p>
          CVora AI, yüklediğiniz CV belgesini yapay zekâ ile analiz ederek puan, öneri ve geri bildirim sunan
          bir araçtır. Sunulan analiz sonuçları bir öneridir; işe alım süreçlerinde başarı garantisi vermez.
        </p>

        <h2>2. Hesap Sorumluluğu</h2>
        <ul>
          <li>Hesap bilgilerinizin (özellikle şifrenizin) gizliliğinden siz sorumlusunuz.</li>
          <li>Hesabınız üzerinden gerçekleşen işlemlerden siz sorumlusunuz.</li>
          <li>Sadece kendinize ait, doğru bilgilerle hesap oluşturmalısınız.</li>
        </ul>

        <h2>3. Free ve Premium Planlar</h2>
        <p>
          Free plan ayda sınırlı sayıda analiz hakkı sunar. Premium plan, aylık sınırsız analiz sunar ve
          İyzico üzerinden işlenen bir abonelik ödemesi gerektirir. Premium aboneliğinizi Hesap Sayfanızdan
          istediğiniz zaman iptal edebilirsiniz.
        </p>

        <h2>4. Yasak Kullanımlar</h2>
        <ul>
          <li>Uygulamayı başkalarına ait belgeleri izinsiz analiz etmek için kullanmak.</li>
          <li>Uygulamanın altyapısına zarar verecek veya aşırı yük bindirecek şekilde kullanmak.</li>
          <li>Hizmeti tersine mühendislik yapmaya veya yetkisiz erişim sağlamaya çalışmak.</li>
        </ul>

        <h2>5. Sorumluluğun Sınırlandırılması</h2>
        <p>
          Analiz sonuçları yapay zekâ tarafından üretilir ve mutlak doğruluk garanti edilmez. Uygulama,
          analiz sonuçlarına dayanılarak alınan kararlardan (iş başvurusu, işe alım vb.) doğabilecek
          zararlardan sorumlu tutulamaz.
        </p>

        <h2>6. Değişiklikler</h2>
        <p>
          Bu şartlar zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinde duyurulacaktır.
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

export default TermsPage
