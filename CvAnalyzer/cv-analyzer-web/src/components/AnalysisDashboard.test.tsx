import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisDashboard from './AnalysisDashboard'
import ListCard from './ListCard'
import TagCard from './TagCard'
import TextCard from './TextCard'
import { I18nProvider } from '../context/I18nContext'
import type { CvAnalysisResult } from '../types/cv'

function renderDashboard(result: CvAnalysisResult) {
  return render(
    <I18nProvider>
      <AnalysisDashboard result={result} />
    </I18nProvider>,
  )
}

const FULL_RESULT: CvAnalysisResult = {
  overallScore: 82,
  summary: 'Strong technical CV with clear backend experience.',
  strengths: ['Clear structure', 'Relevant experience'],
  weaknesses: ['No quantifiable achievements'],
  skills: ['C#', 'ASP.NET Core', 'PostgreSQL'],
  experience: '3+ years as a backend developer.',
  education: 'BSc Computer Science.',
  missingKeywords: ['Docker', 'CI/CD'],
  recommendations: ['Add measurable impact to experience bullet points.'],
}

describe('empty-state handling', () => {
  it('ListCard renders nothing for an empty array', () => {
    const { container } = render(<ListCard title="Güçlü Yönler" items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('TagCard renders nothing for an empty array', () => {
    const { container } = render(<TagCard title="Yetenekler" items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('TextCard renders nothing for an empty or whitespace-only string', () => {
    const { container: emptyContainer } = render(<TextCard title="Deneyim" text="" />)
    expect(emptyContainer).toBeEmptyDOMElement()

    const { container: whitespaceContainer } = render(<TextCard title="Eğitim" text="   " />)
    expect(whitespaceContainer).toBeEmptyDOMElement()
  })

  it('AnalysisDashboard with several empty fields never renders "undefined", "null", or "No data"', () => {
    const partialResult: CvAnalysisResult = {
      ...FULL_RESULT,
      experience: '',
      education: '',
      missingKeywords: [],
      weaknesses: [],
    }

    renderDashboard(partialResult)

    expect(screen.queryByText('Deneyim')).not.toBeInTheDocument()
    expect(screen.queryByText('Eğitim')).not.toBeInTheDocument()
    expect(screen.queryByText('Eksik / Önerilen Anahtar Kelimeler')).not.toBeInTheDocument()
    expect(screen.queryByText('Geliştirilmesi Gerekenler')).not.toBeInTheDocument()

    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^null$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no data/i)).not.toBeInTheDocument()
  })

  it('renders AI-supplied HTML/script-like content as literal text, never as markup', () => {
    // The AI response is untrusted content (a CV can contain arbitrary attacker-supplied text,
    // and the model can echo it back) — this proves React's default escaping is actually in
    // effect end-to-end through AnalysisDashboard, not just assumed because no
    // dangerouslySetInnerHTML appears in the source.
    const maliciousPayload = '<img src=x onerror=alert(1)>'
    const maliciousScript = '<script>alert(1)</script>'
    const hostileResult: CvAnalysisResult = {
      ...FULL_RESULT,
      summary: maliciousScript,
      strengths: [maliciousPayload],
      experience: maliciousPayload,
    }

    const { container } = renderDashboard(hostileResult)

    // No actual <img> or <script> element was created from the AI text.
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()

    // The literal, unescaped-looking string is present as ordinary text content.
    expect(screen.getByText(maliciousScript)).toBeInTheDocument()
    expect(screen.getAllByText(maliciousPayload).length).toBeGreaterThan(0)
  })

  it('AnalysisDashboard with a fully populated result shows every section', () => {
    renderDashboard(FULL_RESULT)

    expect(screen.getByText('82')).toBeInTheDocument()
    expect(screen.getByText(FULL_RESULT.summary)).toBeInTheDocument()
    expect(screen.getByText('Clear structure')).toBeInTheDocument()
    expect(screen.getByText('No quantifiable achievements')).toBeInTheDocument()
    expect(screen.getByText('C#')).toBeInTheDocument()
    expect(screen.getByText(FULL_RESULT.experience)).toBeInTheDocument()
    expect(screen.getByText(FULL_RESULT.education)).toBeInTheDocument()
    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.getByText(/yapay zekâ tarafından önerilmiştir/)).toBeInTheDocument()
    expect(screen.getByText(FULL_RESULT.recommendations[0])).toBeInTheDocument()
  })
})
