import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisDashboard from './AnalysisDashboard'
import ListCard from './ListCard'
import TagCard from './TagCard'
import TextCard from './TextCard'
import type { CvAnalysisResult } from '../types/cv'

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

    render(<AnalysisDashboard result={partialResult} />)

    expect(screen.queryByText('Deneyim')).not.toBeInTheDocument()
    expect(screen.queryByText('Eğitim')).not.toBeInTheDocument()
    expect(screen.queryByText('Eksik / Önerilen Anahtar Kelimeler')).not.toBeInTheDocument()
    expect(screen.queryByText('Geliştirilmesi Gerekenler')).not.toBeInTheDocument()

    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^null$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/no data/i)).not.toBeInTheDocument()
  })

  it('AnalysisDashboard with a fully populated result shows every section', () => {
    render(<AnalysisDashboard result={FULL_RESULT} />)

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
