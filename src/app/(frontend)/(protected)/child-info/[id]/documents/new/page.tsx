'use client'

import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './UploadChildDoc.module.css'
import { FileText, UploadCloud, X, ArrowLeft, ShieldCheck } from 'lucide-react'

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

function normalizeId(v: unknown): string | number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const trimmed = v.trim()
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

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [noteShort, setNoteShort] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return !!childId && !!file && !!title.trim() && !loading
  }, [childId, file, title, loading])

  async function uploadToMedia(f: File) {
    const form = new FormData()
    form.append('file', f)

    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })

    const raw = await res.text()
    const json = safeJsonParse(raw)

    if (!res.ok) {
      const msg = extractErrorMessage(raw, json, `Upload media failed (${res.status})`)
      throw new Error(`Media upload failed: ${msg}`)
    }

    const mediaId = json?.id ?? json?.doc?.id
    if (mediaId === null || mediaId === undefined || mediaId === '') {
      console.error('[uploadToMedia] unexpected response', { status: res.status, raw, json })
      throw new Error('Media upload succeeded, but no media id was returned.')
    }

    return { mediaId, raw, json }
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
      const msg = extractErrorMessage(raw, json, `Create document failed (${res.status})`)
      throw new Error(`Document creation failed: ${msg}`)
    }

    return { raw, json }
  }

  async function onSubmit(e: React.FormEvent) {
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
      setError('Only PDF, JPG, PNG, or WEBP files are allowed.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.')
      return
    }

    setLoading(true)

    try {
      const mediaRes = await uploadToMedia(file)

      const normalizedChildId = normalizeId(childId)
      const normalizedMediaId = normalizeId(mediaRes.mediaId)

      if (!normalizedChildId) {
        throw new Error('Missing or invalid child id.')
      }

      if (!normalizedMediaId) {
        throw new Error('Missing or invalid uploaded media id.')
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
      setError(err?.message || 'Something went wrong.')
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
            Back
          </button>
          <div className={styles.headerText}>
          <div className={styles.kicker}>Child documents</div>
          <h1 className={styles.title}>Upload document</h1>
          <p className={styles.sub}>
            Add a document to this child profile in a clear, structured way.
          </p>
        </div>
        </div>

        <form onSubmit={onSubmit} className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardTopIcon}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className={styles.cardTitle}>Document details</div>
              <div className={styles.cardSub}>
                Supported files: PDF, JPG, PNG, WEBP. Maximum size: 10MB.
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>File</label>

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
                  <div className={styles.uploadTitle}>Choose a file to upload</div>
                  <div className={styles.uploadSub}>
                    Click to browse your device
                  </div>
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
                        {file.type || 'Unknown type'} • {prettyFileSize(file.size)}
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
                    aria-label="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </label>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.field}>
              <label className={styles.label}>Title</label>
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                placeholder="Eg: Birth certificate / Vaccine record"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select
                className={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                disabled={loading}
              >
                <option value="agreement">Agreements</option>
                <option value="school">School</option>
                <option value="health">Health</option>
                <option value="id">ID</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Note (short)</label>
            <input
              className={styles.input}
              value={noteShort}
              onChange={(e) => setNoteShort(e.target.value)}
              disabled={loading}
              maxLength={160}
              placeholder="Optional short context for the other parent"
            />
            <div className={styles.hint}>{noteShort.length}/160 characters</div>
          </div>

          {error ? <div className={styles.error}>⚠ {error}</div> : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={!canSubmit}
            >
              {loading ? 'Uploading…' : 'Upload document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}