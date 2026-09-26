// NOTE: this no longer needs to be run manually — api/_lib/db.ts's
// ensureSchema() now seeds these same 53 topics automatically the first
// time the database is used (guarded by a `seed_meta` row, so it only ever
// runs once and a later deletion via the admin panel is never resurrected).
// Kept here as a manual/CLI fallback (e.g. to force-reseed against a
// database that already has a seed_meta row, or for local testing).
//
// One-off content seed: creates the "Yetişkin Algoritmalar" (acil-yaklasimlar)
// topics from the T.C. Sağlık Bakanlığı algorithm images in
// public/algorithms/acil-yaklasimlar/. Each topic is image-only (no body
// text) by design — see the task this was written for.
//
// Uses the same /api/admin endpoints a real admin session would use, so the
// result is identical to adding these one by one through the panel: normal
// DB rows, fully editable/reorderable/deletable afterwards.
//
// Usage:
//   API_BASE=https://your-deployed-site.vercel.app \
//   ADMIN_USERNAME=... ADMIN_PASSWORD=... \
//   node scripts/seed-yetiskin-algoritmalar.mjs
//
// Safe to re-run: skips any title that already exists in the category.

const API_BASE = process.env.API_BASE ?? "http://localhost:8787";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CATEGORY_SLUG = "acil-yaklasimlar";

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("ADMIN_USERNAME ve ADMIN_PASSWORD ortam değişkenleri gerekli.");
  process.exit(1);
}

// order, title, image filename (under public/algorithms/acil-yaklasimlar/)
const TOPICS = [
  "Olay Yeri Yönetimi",
  "Acil Olgu Yönetimi Anahtar Noktalar",
  "Acil Olgu Yönetimi",
  "Hava Yolu Tıkanıklıkları",
  "KOAH Anahtar Noktalar",
  "KOAH",
  "Astım Anahtar Noktalar",
  "Astım",
  "Akut Koroner Sendrom Anahtar Noktalar",
  "Akut Koroner Sendrom",
  "Bradikardi Anahtar Noktalar",
  "Bradikardi",
  "Nabızlı Taşikardi",
  "Arrest Yönetimi",
  "Şoklanamaz Ritim Yönetimi Anahtar Noktalar",
  "Şoklanamaz Ritim Yönetimi: Asistoli / NEA",
  "Şoklanır Ritim Yönetimi VF / Nabızsız VT Anahtar Noktalar",
  "Şoklanır Ritim Yönetimi: VF / Nabızsız VT",
  "Resüsitasyon Sonrası Bakım",
  "Hipovolemik Şok",
  "Akut Akciğer Ödemi ve Kardiyojenik Şok Anahtar Noktalar",
  "Kalp Yetmezliğine Bağlı Akut Akciğer Ödemi ve Kardiyojenik Şok",
  "Ajite Hastaya Yaklaşım Anahtar Noktalar",
  "Ajite Hastaya Yaklaşım",
  "Bilinç Değişiklikleri Anahtar Noktalar",
  "Bilinç Değişikliği",
  "Diyabetik Aciller",
  "İnme / SVO",
  "Nöbet / Konvülziyon",
  "Vertigo",
  "Alerjik Reaksiyon",
  "Anafilaksi Anahtar Noktalar",
  "Anafilaksi",
  "Hipertermi Anahtar Noktalar",
  "Hipertermi",
  "Hipotermi Anahtar Noktalar",
  "Hipotermi",
  "Hipotermide Arrest Yönetimi Anahtar Noktalar",
  "Hipotermide Arrest Yönetimi",
  "Isırma ve Sokmalar Anahtar Noktalar",
  "Isırma ve Sokmalar",
  "Suda Boğulma Anahtar Noktalar",
  "Suda Boğulma",
  "Yanık Anahtar Noktalar (Sıvı ve Transfer)",
  "Yanık Anahtar Noktalar (Vücut Yüzey Alanı)",
  "Termal Yanık",
  "Elektrik Yanıkları",
  "Kimyasal Yanıklar",
  "Zehirlenmelere Genel Yaklaşım Anahtar Noktalar",
  "Zehirlenmelere Genel Yaklaşım",
  "Yüksek Doz İlaç Alımı",
  "Karbonmonoksit Zehirlenmesi",
  "Kalsiyum Kanal Blokerleri / Beta Blokerlerle Zehirlenme Anahtar Noktalar",
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let cookie = "";

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${data.error ?? "hata"}`);
  return data;
}

async function main() {
  console.log(`[seed] ${API_BASE} adresine giriş yapılıyor...`);
  await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });

  const { topics: existing } = await api(`/api/admin/topic?category=${CATEGORY_SLUG}`);
  const existingTitles = new Set(existing.map((t) => t.title));

  let created = 0;
  let skipped = 0;
  for (const title of TOPICS) {
    if (existingTitles.has(title)) {
      console.log(`[skip] zaten var: ${title}`);
      skipped++;
      continue;
    }
    const slug = slugify(title);
    const imageUrl = `/algorithms/acil-yaklasimlar/${slug}.jpg`;
    await api("/api/admin/topic", {
      method: "POST",
      body: JSON.stringify({ categorySlug: CATEGORY_SLUG, title, content: "", imageUrl }),
    });
    console.log(`[ok] ${title}`);
    created++;
  }

  console.log(`\n[seed] tamamlandı: ${created} oluşturuldu, ${skipped} atlandı (zaten mevcuttu).`);
}

main().catch((err) => {
  console.error("[seed] HATA:", err.message);
  process.exit(1);
});
