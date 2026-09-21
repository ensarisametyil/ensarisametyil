// Drug reference content reconstructed verbatim from the original
// ACİLTİMEKG application bundle (its compiled JSX children strings).
// Fields the source did not expose in extractable text form (e.g. adult
// bolus doses for Adenozin, side-effect prose for Adenozin) are marked
// with `placeholder: true` rather than invented — per the project brief,
// no clinical value is added that wasn't recovered from the real source.

export interface DoseStep {
  label: string;
  value: string;
  note?: string;
  placeholder?: boolean;
}

export interface DrugProfile {
  slug: "adenozin" | "amiodaron" | "atropin";
  name: string;
  formCaption: string;
  timing: { label: string; value: string }[];
  indications: { context: string; note?: string; placeholder?: boolean }[];
  /** Not present in the recovered source content for any of the three drugs — always shown as a placeholder. */
  contraindications: { text: string; placeholder: true }[];
  doseGroups: {
    heading: string; // e.g. "Yetişkin", "Pediatri", "Yetişkin · VF / Nabızsız VT"
    subheading?: string; // e.g. "Kilo bazlı doz"
    steps: DoseStep[];
  }[];
  sideEffects: { text: string; placeholder?: boolean }[];
  criticalNotes: { heading: string; text: string; placeholder?: boolean }[];
  usageNote?: string;
  /** Categories to pull "İlişkili Algoritmalar" from — derived from the drug's real clinical context (e.g. Amiodaron → Kardiyoloji), not invented per-item links. */
  relatedCategorySlugs: ("acil-yaklasimlar" | "kardiyoloji" | "toksikoloji" | "pediatri")[];
}

export const drugs: DrugProfile[] = [
  {
    slug: "adenozin",
    name: "Adenozin",
    formCaption: "Adenozin · IV uygulama formu",
    timing: [
      { label: "Etki süresi", value: "30–40 sn" },
      { label: "Uygulama yolu", value: "Direkt IV bolus" },
    ],
    indications: [
      { context: "Birincil kullanım", placeholder: true },
      { context: "Ayırıcı tanı", placeholder: true },
    ],
    doseGroups: [
      {
        heading: "Yetişkin",
        subheading: "Doz basamakları",
        steps: [{ label: "Doz basamakları", value: "", placeholder: true }],
      },
      {
        heading: "Pediatri",
        subheading: "Kilo bazlı doz",
        steps: [
          { label: "Başlangıç dozu · Sınıf I", value: "0,1 mg/kg IV" },
          { label: "Tekrar gerekirse", value: "0,2 mg/kg IV" },
        ],
      },
    ],
    contraindications: [{ text: "", placeholder: true }],
    sideEffects: [{ text: "", placeholder: true }],
    criticalNotes: [{ heading: "Dikkat · kritik güvenlik", text: "Monitörizasyon zorunludur." }],
    usageNote: "Üçlü musluk · Adenozin ve SF hızlı bolus uygulaması ile, hızlı uygulama tekniği gerektirir.",
    relatedCategorySlugs: ["kardiyoloji", "acil-yaklasimlar"],
  },
  {
    slug: "amiodaron",
    name: "Amiodaron",
    formCaption: "Amiodaron · 150 mg / 3 mL IV uygulama formu",
    timing: [
      { label: "Kardiyak etki", value: "Negatif inotrop" },
      { label: "Hız etkisi", value: "Negatif kronotrop" },
      { label: "İnfüzyon sonrası (30–45 dakika)", value: "Zirve değerinin yaklaşık %10'una geriler." },
      { label: "5 haftaya kadar", value: "İlaç bırakıldıktan sonra klinik etkileri devam edebilir." },
    ],
    indications: [
      { context: "VF / Nabızsız VT", note: "Şoklanabilir ritim yönetimi" },
    ],
    doseGroups: [
      {
        heading: "Yetişkin · VF / Nabızsız VT",
        subheading: "Şok sonrası dozlar",
        steps: [
          { label: "3. şoktan sonra", value: "300 mg", note: "%5 dekstroz ile sulandırılarak IV puşe uygulanır." },
          { label: "5. şoktan sonra", value: "150 mg" },
        ],
      },
      {
        heading: "Yaşayan hasta · Stabil VT / SVT",
        subheading: "İnfüzyon dozu",
        steps: [{ label: "İnfüzyon dozu", value: "150 mg", note: "10 dakikada" }],
      },
      {
        heading: "Pediatri · VF / Nabızsız VT",
        subheading: "Kilo bazlı doz",
        steps: [
          { label: "Bolus · maksimum 300 mg", value: "5 mg/kg" },
          { label: "Toplam üst sınır", value: "15 mg/kg", note: "İki kez tekrar edilebilir." },
        ],
      },
    ],
    sideEffects: [
      { text: "Hipotansiyon, amiodaronun sulandırılmış formunda daha az görülebilir." },
    ],
    criticalNotes: [
      {
        heading: "Dikkat · kritik güvenlik — Arrest ve toksikoloji uyarıları",
        text: "3. ve 5. şoktan sonraki dozlar (Sınıf 2b, KD B) olarak sınıflandırılır.",
      },
    ],
    contraindications: [{ text: "", placeholder: true }],
    relatedCategorySlugs: ["kardiyoloji", "acil-yaklasimlar"],
  },
  {
    slug: "atropin",
    name: "Atropin",
    formCaption: "Atropin sülfat · 1 mg / 1 mL IV, IM ve SC uygulama formu",
    timing: [
      { label: "Etki başlangıcı", value: "2–4 dk" },
      { label: "Etki süresi", value: "5 saat" },
    ],
    indications: [
      { context: "Yetişkin · Semptomatik bradikardi" },
      { context: "Organofosfat maruziyeti", note: "Bradikardi ve kolinerjik bulgular" },
    ],
    doseGroups: [
      {
        heading: "Yetişkin · Semptomatik bradikardi",
        subheading: "Atropin doz şeması",
        steps: [
          { label: "Başlangıç dozu", value: "1 mg", note: "IV puşe" },
          { label: "Tekrar aralığı", value: "3–5 dk", note: "Yanıta göre tekrar" },
          { label: "Maksimum toplam", value: "3 mg", note: "Üst doz sınırı" },
        ],
      },
      {
        heading: "Toksikoloji · Organofosfat zehirlenmesi",
        subheading: "Doz şeması",
        steps: [
          { label: "Başlangıç dozu", value: "2 mg", note: "IV uygulama" },
          { label: "Tekrar aralığı", value: "5 dk", note: "Sekresyon azalana kadar" },
          { label: "IV yol bulunamazsa", value: "6 mg IM" },
        ],
      },
      {
        heading: "Pediatri",
        subheading: "Kilo bazlı dozlar",
        steps: [
          { label: "Semptomatik bradikardi", value: "0,02 mg/kg IV" },
          { label: "Organofosfat zehirlenmesi", value: "0,01–0,04 mg/kg IV" },
        ],
      },
    ],
    sideEffects: [{ text: "", placeholder: true }],
    criticalNotes: [
      {
        heading: "Dikkat · kritik güvenlik — Arrest, doz ve AMI uyarıları (Sınıf 2b, KD B)",
        text: "0,4 mg'dan düşük yetişkin dozları, 0,1 mg'dan düşük pediatrik dozlar eksternal pacing uygulamasını geciktirmemelidir. İleri derece AV blokta pacing hazırlığını geciktirmeyin — doğrudan transkütanöz pacemaker düşünülür.",
      },
      {
        heading: "Organofosfat tedavi hedefi",
        text: "Kuruyana kadar atropin — sekresyonların kuruması tedavi hedefidir. Pupil dilatasyonu tedavi sonlanım noktası için gösterge değildir. Tedavi yalnızca taşikardi nedeniyle kesilmemelidir. Tüm atropin zehirlenmelerinde aktif kömür verilmelidir.",
      },
      {
        heading: "Atropin intoksikasyonu — Gözlem ve takip",
        text: "6 yaş altı çocuk: 24 saat yatış ve yakın takip. Büyük çocuk ve erişkin: 6 saat acil serviste gözlem.",
      },
    ],
    contraindications: [{ text: "", placeholder: true }],
    relatedCategorySlugs: ["acil-yaklasimlar", "toksikoloji", "pediatri"],
  },
];

export function findDrug(slug: string) {
  return drugs.find((d) => d.slug === slug);
}
