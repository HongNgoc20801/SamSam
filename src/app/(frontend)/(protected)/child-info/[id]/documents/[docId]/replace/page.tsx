'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, RefreshCcw, UploadCloud, X } from 'lucide-react'
import styles from "./ReplaceChilDoc.module.css"

const DOCS_SLUG = 'child_documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024

type Category = 'agreement' | 'school' | 'health' | 'id' | 'other'

type Media = {
  id: string | number
  filename?: string
  filesize?: number
  url?: string
  mimeType?: string
}

type ChildRelation = string | number | { id: string | number }

type ChildDoc = {
  id: string
  title: string
  category?: Category
  noteShort?: string
  version?: number
  child?: ChildRelation
  file?: string | Media
}

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

  if (typeof v === 'object' && v !== null && 'id' in v) {
    return normalizeId((v as any).id)
  }

  return null
}

function prettyFileSize(size?: number) {
  if (!size || size <= 0) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function categoryLabel(c?: Category | string) {
  if (c === 'agreement') return 'Agreements'
  if (c === 'school') return 'School'
  if (c === 'health') return 'Health'
  if (c === 'id') return 'ID'
  return 'Other'
}

export default function ReplaceChildDocPage() {
  const router = useRouter()
  const params = useParams<{ id: string; docId: string }>()

  const childId = params?.id
  const docId = params?.docId

  const [currentDoc, setCurrentDoc] = useState<ChildDoc | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return !!childId && !!docId && !!currentDoc && !!file && !loading && !loadingInitial
  }, [childId, docId, currentDoc, file, loading, loadingInitial])

  useEffect(() => {
    let cancelled = false

    async function loadDoc() {
      if (!docId) return

      setLoadingInitial(true)
      setError('')

      try {
        const res = await fetch(`/api/${DOCS_SLUG}/${docId}?depth=1`, {
          credentials: 'include',
          cache: 'no-store',
        })

        const raw = await res.text()
        const json = safeJsonParse(raw)

        if (!res.ok) {
          throw new Error(
            extractErrorMessage(raw, json, `Load document failed (${res.status})`),
          )
        }

        if (!cancelled) {
          setCurrentDoc(json as ChildDoc)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load document.')
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false)
        }
      }
    }

    loadDoc()

    return () => {
      cancelled = true
    }
  }, [docId])

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
      throw new Error(
        `Media upload failed: ${extractErrorMessage(raw, json, `Upload media failed (${res.status})`)}`,
      )
    }

    const mediaId = json?.id ?? json?.doc?.id

    if (mediaId === null || mediaId === undefined || mediaId === '') {
      throw new Error('Media upload succeeded, but no media id was returned.')
    }

    return mediaId
  }

  async function createReplacementDocument(input: {
    child: string | number
    file: string | number
    title: string
    category: Category
    noteShort?: string
    replaces: string | number
  }) {
    const res = await fetch(`/api/${DOCS_SLUG}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const raw = await res.text()
    const json = safeJsonParse(raw)

    console.log('[createReplacementDocument] status:', res.status)
    console.log('[createReplacementDocument] raw:', raw)
    console.log('[createReplacementDocument] json:', json)

    if (!res.ok) {
      throw new Error(
        `Document creation failed: ${extractErrorMessage(raw, json, `Create document failed (${res.status})`)}`,
      )
    }

    return json
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !file || !currentDoc || !docId) return

    setError('')

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

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
      const normalizedChildId = normalizeId(currentDoc.child)
      if (!normalizedChildId) {
        throw new Error('Missing child id from current document.')
      }

      const normalizedReplacesId = normalizeId(docId)
      if (!normalizedReplacesId) {
        throw new Error('Missing original document id.')
      }

      const uploadedMediaId = await uploadToMedia(file)
      const normalizedMediaId = normalizeId(uploadedMediaId)

      if (!normalizedMediaId) {
        throw new Error('Missing uploaded media id.')
      }

      const payload = {
        child: normalizedChildId,
        file: normalizedMediaId,
        title: currentDoc.title?.trim() || 'Untitled document',
        category: currentDoc.category || 'other',
        noteShort: currentDoc.noteShort?.trim() || undefined,
        replaces: normalizedReplacesId,
      }

      console.log('[ReplaceChildDoc] payload:', payload)

      const created = await createReplacementDocument(payload)
      const newDocId = created?.id

      if (newDocId) {
        router.push(`/child-info/${childId}/documents/${newDocId}`)
      } else {
        router.push(`/child-info/${childId}/documents`)
      }

      router.refresh()
    } catch (err: any) {
      console.error('[ReplaceChildDoc] ERROR', err)
      setError(err?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const currentFile =
    currentDoc?.file && typeof currentDoc.file === 'object' ? currentDoc.file : null

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
            <h1 className={styles.title}>Replace document</h1>
            <p className={styles.sub}>
              Upload a new file to create a new document version. The current document will
              remain in history.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className={styles.card}>
          <div className={styles.cardTop}>
            <div className={styles.cardTopIcon}>
              <RefreshCcw size={18} />
            </div>
            <div>
              <div className={styles.cardTitle}>Current document</div>
              <div className={styles.cardSub}>
                Replace creates a new version. It does not overwrite the old file.
              </div>
            </div>
          </div>

          {loadingInitial ? (
            <div className={styles.infoBox}>Loading document...</div>
          ) : currentDoc ? (
            <>
              <div className={styles.currentBox}>
                <div className={styles.currentTitle}>Document information</div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>Title</span>
                  <span className={styles.currentMetaValue}>{currentDoc.title || '—'}</span>
                </div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>Category</span>
                  <span className={styles.currentMetaValue}>
                    {categoryLabel(currentDoc.category)}
                  </span>
                </div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>Version</span>
                  <span className={styles.currentMetaValue}>v{currentDoc.version ?? 1}</span>
                </div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>Current file</span>
                  <span className={styles.currentMetaValue}>
                    {currentFile?.filename || '—'}
                    {currentFile?.filesize ? ` • ${prettyFileSize(currentFile.filesize)}` : ''}
                  </span>
                </div>

                {currentDoc.noteShort ? (
                  <div className={styles.currentMetaRow}>
                    <span className={styles.currentMetaLabel}>Note</span>
                    <span className={styles.currentMetaValue}>{currentDoc.noteShort}</span>
                  </div>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>New file</label>

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
                      <div className={styles.uploadTitle}>Choose replacement file</div>
                      <div className={styles.uploadSub}>
                        PDF, JPG, PNG or WEBP up to 10MB
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
            </>
          ) : (
            <div className={styles.infoBox}>Document not found.</div>
          )}

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

            <button type="submit" className={styles.primaryBtn} disabled={!canSubmit}>
              {loading ? 'Replacing…' : 'Replace document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}