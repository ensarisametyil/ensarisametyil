import { useRef, useState, type DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { useTranslation } from '../hooks/useTranslation'
import Spinner from './Spinner'
import styles from './UploadBox.module.css'

interface UploadBoxProps {
  onFileSelected: (file: File) => void
  isUploading: boolean
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx']

function hasAllowedExtension(fileName: string): boolean {
  const lowerName = fileName.toLowerCase()
  return ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
}

/** Drag-and-drop / click-to-browse CV upload area. Server-side validation remains authoritative. */
function UploadBox({ onFileSelected, isUploading }: UploadBoxProps) {
  const { t } = useTranslation()
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) {
      return
    }

    if (!hasAllowedExtension(file.name)) {
      setLocalError(t('upload.invalidType'))
      return
    }

    setLocalError(null)
    onFileSelected(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDraggingOver(false)
    if (isUploading) {
      return
    }
    handleFile(event.dataTransfer.files[0])
  }

  return (
    <div>
      <div
        className={`${styles.dropzone} ${isDraggingOver ? styles.dropzoneActive : ''} ${isUploading ? styles.dropzoneDisabled : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!isUploading) {
            setIsDraggingOver(true)
          }
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={isUploading}
        onKeyDown={(event) => {
          if (!isUploading && (event.key === 'Enter' || event.key === ' ')) {
            inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          data-testid="cv-file-input"
          className={styles.hiddenInput}
          disabled={isUploading}
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        {isUploading ? (
          <Spinner label={t('upload.uploading')} />
        ) : (
          <>
            <span className={styles.icon} aria-hidden="true">
              <UploadCloud size={22} strokeWidth={1.75} />
            </span>
            <p className={styles.title}>{t('upload.dropHint')}</p>
            <p className={styles.hint}>{t('upload.sizeHint')}</p>
          </>
        )}
      </div>

      {localError && <p className={styles.localError}>{localError}</p>}
    </div>
  )
}

export default UploadBox
