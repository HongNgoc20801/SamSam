'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  FolderOpen,
  UploadCloud,
  X,
} from 'lucide-react'

import styles from './UploadChildDoc.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

const DOCS_SLUG = 'child_documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024

type Category = 'agreement' | 'school' | 'health' | 'id' | 'other'

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function extractErrorMessage(raw: string, parsed: any, fallback: string) {
  return (
    parsed?.message ||
    parsed?.error ||
    parsed?.errors?.[0]?.message ||
    parsed?.errors?.[0] ||
    raw ||
    fallback
  )
}

function normalizeId(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  return null
}

function prettyFileSize(size?: number) {
  if (!size || size <= 0) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadChildDocPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const childId = params?.id

  const t = useTranslations()
  const td = t.uploadChildDoc

  const [childName, setChildName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [noteShort, setNoteShort] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(childId && file && title.trim() && !loading)
  }, [childId, file, title, loading])

  useEffect(() => {
    if (!childId) return

    let ignore = false

    ;(async () => {
      try {
        const res = await fetch(`/api/children/${childId}?depth=0`, {
          credentials: 'include',
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)

        if (!ignore && res.ok) {
          setChildName(data?.fullName || '')
        }
      } catch {
        if (!ignore) setChildName('')
      }
    })()

    return () => {
      ignore = true
    }
  }, [childId])

  async function uploadToMedia(selectedFile: File) {
    const form = new FormData()
    form.append('file', selectedFile)

    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })

    const raw = await res.text()
    const json = safeJsonParse(raw)

    if (!res.ok) {
      const msg = extractErrorMessage(raw, json, td.uploadMediaFailed)
      throw new Error(msg)
    }

    const mediaId = json?.id ?? json?.doc?.id

    if (mediaId === null || mediaId === undefined || mediaId === '') {
      throw new Error(td.uploadMediaNoId)
    }

    return mediaId
  }

  async function createChildDocument(input: {
    child: string | number
    file: string | number
    title: string
    category: Category
    noteShort?: string
  }) {
    const res = await fetch(`/api/${DOCS_SLUG}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const raw = await res.text()
    const json = safeJsonParse(raw)

    if (!res.ok) {
      const msg = extractErrorMessage(raw, json, td.createDocumentFailed)
      throw new Error(msg)
    }

    return json
  }

  function handleFileSelect(selectedFile?: File | null) {
    setError('')

    if (!selectedFile) {
      setFile(null)
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(selectedFile.type)) {
      setError(td.onlyAllowedTypes)
      setFile(null)
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(td.fileTooLarge)
      setFile(null)
      return
    }

    setFile(selectedFile)

    if (!title.trim()) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || !file || !childId) return

    setError('')
    setLoading(true)

    try {
      const mediaId = await uploadToMedia(file)

      const normalizedChildId = normalizeId(childId)
      const normalizedMediaId = normalizeId(mediaId)

      if (!normalizedChildId) throw new Error(td.invalidChildId)
      if (!normalizedMediaId) throw new Error(td.invalidMediaId)

      await createChildDocument({
        child: normalizedChildId,
        file: normalizedMediaId,
        title: title.trim(),
        category,
        noteShort: noteShort.trim() || undefined,
      })

      router.push(`/child-info/${childId}`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || td.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
      <div className={styles.breadcrumb}>
      <button
        type="button"
        className={styles.breadcrumbBack}
        onClick={() => router.back()}
        disabled={loading}
      >
        <ArrowLeft size={14} />
        Back to Profile
      </button>

      <span className={styles.bcSep}>/</span>

      <span>Children</span>
      <span className={styles.bcChevron}>›</span>
      <span>{childName || 'Child profile'}</span>
      <span className={styles.bcChevron}>›</span>
      <span>{td.kicker}</span>
    </div>

        <header className={styles.header}>
          <h1 className={styles.title}>{td.pageTitle}</h1>
          <p className={styles.sub}>{td.pageHint}</p>
        </header>

        <form onSubmit={onSubmit} className={styles.card}>
          <section className={styles.uploadPane}>
            <div className={styles.paneLabel}>{td.file}</div>

            <label className={`${styles.uploadBox} ${file ? styles.uploadBoxActive : ''}`}>
              <input
                className={styles.fileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                disabled={loading}
              />

              {!file ? (
                <div className={styles.uploadEmpty}>
                  <div className={styles.uploadIcon}>
                    <UploadCloud size={28} />
                  </div>

                  <div>
                    <div className={styles.uploadTitle}>{td.chooseFile}</div>
                    <div className={styles.uploadSub}>{td.browseDevice}</div>
                  </div>

                  <div className={styles.fileRulePill}>
                    <FileText size={13} />
                    PDF, JPG, PNG, WEBP
                  </div>

                  <div className={styles.fileRulePill}>
                    <FolderOpen size={13} />
                    Max 10MB
                  </div>
                </div>
              ) : (
                <div className={styles.filePreview}>
                  <div className={styles.fileIcon}>
                    <FileText size={22} />
                  </div>

                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileMeta}>
                      {file.type || td.unknownType} • {prettyFileSize(file.size)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.preventDefault()
                      setFile(null)
                    }}
                    disabled={loading}
                    aria-label={td.removeFile}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </label>

            <p className={styles.securityHint}>
              Your privacy is our priority. Files are scanned for security.
            </p>
          </section>

          <section className={styles.formPane}>
            <div className={styles.field}>
              <label>{td.title}</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                placeholder={td.titlePlaceholder}
              />
            </div>

            <div className={`${styles.field} ${styles.categoryRow}`}>
              <label>{td.category}</label>
              <select
                className={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                disabled={loading}
              >
                <option value="agreement">{td.categoryAgreement}</option>
                <option value="school">{td.categorySchool}</option>
                <option value="health">{td.categoryHealth}</option>
                <option value="id">{td.categoryId}</option>
                <option value="other">{td.categoryOther}</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.noteRow}`}>
              <label>{td.noteShort}</label>
              <textarea
              className={styles.textarea}
              value={noteShort}
              onChange={(e) => setNoteShort(e.target.value)}
              disabled={loading}
              maxLength={160}
              placeholder={td.notePlaceholder}
            />
              <div className={styles.hint}>
                {noteShort.length}/160 {td.characters}
              </div>
            </div>

            {error ? <div className={styles.error}>⚠ {error}</div> : null}
          </section>

          <footer className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => router.back()}
              disabled={loading}
            >
              {td.cancel}
            </button>

            <button type="submit" className={styles.primaryBtn} disabled={!canSubmit}>
              <CheckCircle2 size={16} />
              {loading ? td.uploading : td.upload}
            </button>
          </footer>
        </form>
      </main>
    </div>
  )
}