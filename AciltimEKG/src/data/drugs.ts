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

// İlaçlar kategorisi şu an kasıtlı olarak BOŞTUR — bu görev kapsamında
// hiçbir ilaç kartı eklenmemiştir. DrugProfile şeması, ileride bu kategori
// gerçek içerikle doldurulduğunda kullanılmak üzere korunmuştur.
export const drugs: DrugProfile[] = [];

export function findDrug(slug: string) {
  return drugs.find((d) => d.slug === slug);
}
