'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, RefreshCcw, UploadCloud, X } from 'lucide-react'

import styles from './ReplaceChilDoc.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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

function normalizeId(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  if (typeof value === 'object' && value !== null && 'id' in value) {
    return normalizeId((value as any).id)
  }

  return null
}

function prettyFileSize(size?: number) {
  if (!size || size <= 0) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function ReplaceChildDocPage() {
  const router = useRouter()
  const params = useParams<{ id: string; docId: string }>()
  const t = useTranslations()
  const td = t.replaceChildDoc

  const childId = params?.id
  const docId = params?.docId

  const [currentDoc, setCurrentDoc] = useState<ChildDoc | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(childId && docId && currentDoc && file && !loading && !loadingInitial)
  }, [childId, docId, currentDoc, file, loading, loadingInitial])

  function categoryLabel(category?: Category | string) {
    if (category === 'agreement') return td.categoryAgreement
    if (category === 'school') return td.categorySchool
    if (category === 'health') return td.categoryHealth
    if (category === 'id') return td.categoryId
    return td.categoryOther
  }

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
            extractErrorMessage(raw, json, td.failedToLoadDocument),
          )
        }

        if (!cancelled) {
          setCurrentDoc(json as ChildDoc)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || td.failedToLoadDocument)
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
  }, [docId, td.failedToLoadDocument])

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
      throw new Error(
        extractErrorMessage(raw, json, td.uploadMediaFailed),
      )
    }

    const mediaId = json?.id ?? json?.doc?.id

    if (mediaId === null || mediaId === undefined || mediaId === '') {
      throw new Error(td.uploadMediaNoId)
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

    if (!res.ok) {
      throw new Error(
        extractErrorMessage(raw, json, td.createDocumentFailed),
      )
    }

    return json
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!canSubmit || !file || !currentDoc || !docId) return

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
      const normalizedChildId = normalizeId(currentDoc.child)
      if (!normalizedChildId) {
        throw new Error(td.missingChildId)
      }

      const normalizedReplacesId = normalizeId(docId)
      if (!normalizedReplacesId) {
        throw new Error(td.missingOriginalDocumentId)
      }

      const uploadedMediaId = await uploadToMedia(file)
      const normalizedMediaId = normalizeId(uploadedMediaId)

      if (!normalizedMediaId) {
        throw new Error(td.missingUploadedMediaId)
      }

      const payload = {
        child: normalizedChildId,
        file: normalizedMediaId,
        title: currentDoc.title?.trim() || td.untitledDocument,
        category: currentDoc.category || 'other',
        noteShort: currentDoc.noteShort?.trim() || undefined,
        replaces: normalizedReplacesId,
      }

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
      setError(err?.message || td.unknownError)
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
              <RefreshCcw size={18} />
            </div>
            <div>
              <div className={styles.cardTitle}>{td.currentDocumentTitle}</div>
              <div className={styles.cardSub}>{td.currentDocumentHint}</div>
            </div>
          </div>

          {loadingInitial ? (
            <div className={styles.infoBox}>{td.loadingDocument}</div>
          ) : currentDoc ? (
            <>
              <div className={styles.currentBox}>
                <div className={styles.currentTitle}>{td.documentInformation}</div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>{td.title}</span>
                  <span className={styles.currentMetaValue}>
                    {currentDoc.title || td.noValue}
                  </span>
                </div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>{td.category}</span>
                  <span className={styles.currentMetaValue}>
                    {categoryLabel(currentDoc.category)}
                  </span>
                </div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>{td.version}</span>
                  <span className={styles.currentMetaValue}>v{currentDoc.version ?? 1}</span>
                </div>

                <div className={styles.currentMetaRow}>
                  <span className={styles.currentMetaLabel}>{td.currentFile}</span>
                  <span className={styles.currentMetaValue}>
                    {currentFile?.filename || td.noValue}
                    {currentFile?.filesize ? ` • ${prettyFileSize(currentFile.filesize)}` : ''}
                  </span>
                </div>

                {currentDoc.noteShort ? (
                  <div className={styles.currentMetaRow}>
                    <span className={styles.currentMetaLabel}>{td.note}</span>
                    <span className={styles.currentMetaValue}>{currentDoc.noteShort}</span>
                  </div>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>{td.newFile}</label>

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
                      <div className={styles.uploadTitle}>{td.chooseReplacementFile}</div>
                      <div className={styles.uploadSub}>{td.uploadHelp}</div>
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
            </>
          ) : (
            <div className={styles.infoBox}>{td.documentNotFound}</div>
          )}

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
              {loading ? td.replacing : td.replace}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}