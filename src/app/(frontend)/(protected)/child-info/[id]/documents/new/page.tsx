'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, ShieldCheck, UploadCloud, X } from 'lucide-react'

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

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [noteShort, setNoteShort] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(childId && file && title.trim() && !loading)
  }, [childId, file, title, loading])

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
      console.error('[uploadToMedia] unexpected response', { status: res.status, raw, json })
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!canSubmit || !file || !childId) return

    setError('')

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError(td.onlyAllowedTypes)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(td.fileTooLarge)
      return
    }

    setLoading(true)

    try {
      const mediaId = await uploadToMedia(file)

      const normalizedChildId = normalizeId(childId)
      const normalizedMediaId = normalizeId(mediaId)

      if (!normalizedChildId) {
        throw new Error(td.invalidChildId)
      }

      if (!normalizedMediaId) {
        throw new Error(td.invalidMediaId)
      }

      const payload = {
        child: normalizedChildId,
        file: normalizedMediaId,
        title: title.trim(),
        category,
        noteShort: noteShort.trim() || undefined,
      }

      await createChildDocument(payload)

      router.push(`/child-info/${childId}`)
      router.refresh()
    } catch (err: any) {
      console.error('[UploadChildDoc] ERROR', err)
      setError(err?.message || td.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => router.back()}
            disabled={loading}
          >
            <ArrowLeft size={16} />
            {td.back}
          </button>

          <div className={styles.headerText}>
            <div className={styles.kicker}>{td.kicker}</div>
            <h1 className={styles.title}>{td.pageTitle}</h1>
            <p className={styles.sub}>{td.pageHint}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardTopIcon}>
              <ShieldCheck size={18} />
            </div>

            <div>
              <div className={styles.cardTitle}>{td.detailsTitle}</div>
              <div className={styles.cardSub}>{td.detailsHint}</div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{td.file}</label>

            <label className={`${styles.uploadBox} ${file ? styles.uploadBoxActive : ''}`}>
              <input
                className={styles.fileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  setError('')
                  setFile(e.target.files?.[0] ?? null)
                }}
                disabled={loading}
              />

              {!file ? (
                <div className={styles.uploadEmpty}>
                  <div className={styles.uploadIcon}>
                    <UploadCloud size={24} />
                  </div>
                  <div className={styles.uploadTitle}>{td.chooseFile}</div>
                  <div className={styles.uploadSub}>{td.browseDevice}</div>
                </div>
              ) : (
                <div className={styles.filePreview}>
                  <div className={styles.filePreviewLeft}>
                    <div className={styles.fileIcon}>
                      <FileText size={20} />
                    </div>

                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileMeta}>
                        {file.type || td.unknownType} • {prettyFileSize(file.size)}
                      </div>
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
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label className={styles.label}>{td.title}</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                placeholder={td.titlePlaceholder}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{td.category}</label>
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
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{td.noteShort}</label>
            <input
              className={styles.input}
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

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => router.back()}
              disabled={loading}
            >
              {td.cancel}
            </button>

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={!canSubmit}
            >
              {loading ? td.uploading : td.upload}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}