export type ScoreTier = 'low' | 'mid' | 'good' | 'excellent'

/** 0-49 low, 50-69 improvable, 70-84 good, 85-100 excellent. */
export function getScoreTier(score: number): ScoreTier {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'mid'
  return 'low'
}

export function getScoreTierLabel(tier: ScoreTier): string {
  switch (tier) {
    case 'excellent':
      return 'Çok İyi'
    case 'good':
      return 'İyi'
    case 'mid':
      return 'Geliştirilebilir'
    case 'low':
      return 'Düşük'
  }
}
