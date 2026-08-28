import { useCvAnalysis } from '../hooks/useCvAnalysis'
import { useBilling } from '../hooks/useBilling'
import UploadBox from '../components/UploadBox'
import AnalyzeButton from '../components/AnalyzeButton'
import ErrorBanner from '../components/ErrorBanner'
import AnalysisDashboard from '../components/AnalysisDashboard'
import styles from './HomePage.module.css'

function HomePage() {
  const { status, cv, analysis, uploadError, analyzeError, uploadFile, analyze, reset } = useCvAnalysis()
  const { usage, refresh: refreshUsage } = useBilling()

  const isUploading = status === 'uploading'
  const isAnalyzing = status === 'analyzing'
  // Keep the dashboard visible once a result exists, even while a re-analysis is in flight or
  // a re-analysis attempt just failed — losing the previous result on a failed retry would be
  // a worse experience than showing the old result next to the new error.
  const hasAnalysis = analysis !== null

  // remaining is null for an unlimited plan (never blocks) — only a Free user who has spent
  // every credit this period (remaining === 0) gets the button disabled ahead of a wasted click.
  const quotaExhausted = usage?.remaining === 0
  const analyzeDisabledReason = quotaExhausted
    ? "Aylık analiz hakkınızı doldurdunuz. Premium'a geçerek daha fazla analiz yapabilirsiniz."
    : undefined

  const handleAnalyze = async () => {
    await analyze()
    // Keeps the nav's usage counter in sync right after this analysis — harmless to call even
    // when analyze() failed, since usage wouldn't have changed in that case anyway.
    void refreshUsage()
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>CV Analyzer</h1>
        <p>Yapay zekâ destekli CV analiz platformu</p>
      </header>

      {!hasAnalysis && (
        <section className={styles.uploadSection}>
          <UploadBox onFileSelected={uploadFile} isUploading={isUploading} />
          {uploadError && <ErrorBanner message={uploadError} />}

          {cv && (
            <div className={styles.cvInfoRow}>
              <div>
                <p className={styles.cvInfoLabel}>Yüklenen CV</p>
                <p className={styles.cvInfoName}>{cv.fileName}</p>
              </div>
              <AnalyzeButton
                isAnalyzing={isAnalyzing}
                hasExistingResult={false}
                onClick={handleAnalyze}
                disabledReason={analyzeDisabledReason}
              />
            </div>
          )}

          {analyzeError && <ErrorBanner message={analyzeError} />}
        </section>
      )}

      {hasAnalysis && analysis && (
        <section className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <div>
              <p className={styles.cvInfoLabel}>Analiz edilen CV</p>
              <p className={styles.cvInfoName}>{cv?.fileName}</p>
            </div>
            <div className={styles.resultActions}>
              <AnalyzeButton
                isAnalyzing={isAnalyzing}
                hasExistingResult
                onClick={handleAnalyze}
                disabledReason={analyzeDisabledReason}
              />
              <button type="button" className={styles.resetButton} onClick={reset}>
                Başka bir CV yükle
              </button>
            </div>
          </div>

          {analyzeError && <ErrorBanner message={analyzeError} />}

          <AnalysisDashboard result={analysis} />
        </section>
      )}
    </main>
  )
}

export default HomePage
