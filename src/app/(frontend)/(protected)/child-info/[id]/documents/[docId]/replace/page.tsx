'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, RefreshCcw, ShieldCheck, UploadCloud } from 'lucide-react'

import styles from './ReplaceChilDoc.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

const DOCS_SLUG = 'child_documents'

type Category = 'agreement' | 'school' | 'health' | 'id' | 'other'

type Media = {
  id: string
  filename?: string
  filesize?: number
  url?: string
  mimeType?: string
}

type ChildDoc = {
  id: string
  title: string
  category?: Category
  version?: number
  file?: string | Media
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function prettyFileSize(size?: number) {
  if (!size || size <= 0) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function categoryLabel(
  category: Category | undefined,
  td: {
    categoryAgreement: string
    categorySchool: string
    categoryHealth: string
    categoryId: string
    categoryOther: string
  },
) {
  if (category === 'agreement') return td.categoryAgreement
  if (category === 'school') return td.categorySchool
  if (category === 'health') return td.categoryHealth
  if (category === 'id') return td.categoryId
  return td.categoryOther
}

export default function ReplaceDocumentPage() {
  const router = useRouter()
  const params = useParams<{ id: string; docId: string }>()
  const t = useTranslations()
  const td = t.replaceChildDoc

  const childId = params?.id
  const docId = params?.docId

  const [doc, setDoc] = useState<ChildDoc | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentFile = doc?.file && typeof doc.file === 'object' ? doc.file : null

  const canSubmit = useMemo(() => {
    return Boolean(childId && docId && file && !loading && !loadingInitial)
  }, [childId, docId, file, loading, loadingInitial])

  useEffect(() => {
    let cancelled = false

    async function loadDocument() {
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
          throw new Error(json?.message || raw || td.failedToLoadDocument)
        }

        if (!cancelled) {
          setDoc(json as ChildDoc)
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

    loadDocument()

    return () => {
      cancelled = true
    }
  }, [docId, td.failedToLoadDocument])

  async function uploadMedia(selectedFile: File) {
    const formData = new FormData()
    formData.append('file', selectedFile)

    const res = await fetch('/api/media', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })

    const raw = await res.text()
    const json = safeJsonParse(raw)

    if (!res.ok) {
      throw new Error(json?.message || raw || td.failedToUploadFile)
    }

    return json?.doc || json
  }

  async function replaceDocument(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!canSubmit || !file || !docId || !childId) return

    setLoading(true)
    setError('')

    try {
      const uploaded = await uploadMedia(file)

      const res = await fetch(`/api/${DOCS_SLUG}/${docId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file: uploaded.id,
          version: (doc?.version ?? 1) + 1,
        }),
      })

      const raw = await res.text()
      const json = safeJsonParse(raw)

      if (!res.ok) {
        throw new Error(json?.message || raw || td.failedToReplaceDocument)
      }

      router.push(`/child-info/${childId}/documents/${docId}`)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || td.unknownError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.breadcrumb}>
            <Link href={`/child-info/${childId}/documents/${docId}`} className={styles.backBtn}>
              <ArrowLeft size={16} />
              {td.back}
            </Link>

            <span>/</span>

            <Link href={`/child-info/${childId}/documents`} className={styles.breadcrumbLink}>
              {td.documents}
            </Link>

            <span>/</span>

            <span className={styles.breadcrumbCurrent}>{doc?.title || td.pageTitle}</span>
          </div>

          <h1 className={styles.title}>{td.pageTitle}</h1>
          <p className={styles.sub}>{td.pageHint}</p>
        </header>

        <form onSubmit={replaceDocument} className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <RefreshCcw size={22} />
            </div>

            <div>
              <h2 className={styles.cardTitle}>{td.currentDocument}</h2>
              <p className={styles.cardSub}>{td.currentDocumentHint}</p>
            </div>
          </div>

          <div className={styles.contentGrid}>
            <aside className={styles.infoPanel}>
              <h3 className={styles.panelTitle}>{td.documentInfo}</h3>

              {loadingInitial ? (
                <div className={styles.infoBox}>{td.loadingDocument}</div>
              ) : (
                <>
                  <div className={styles.fileCard}>
                    <div className={styles.fileIcon}>
                      <FileText size={22} />
                    </div>

                    <div>
                      <div className={styles.fileName}>
                        {currentFile?.filename || td.noFile}
                      </div>
                      <div className={styles.fileMeta}>
                        {currentFile?.mimeType || td.unknownFileType}
                        {currentFile?.filesize ? ` • ${prettyFileSize(currentFile.filesize)}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailBox}>
                    <span>{td.title}</span>
                    <strong>{doc?.title || td.noValue}</strong>
                  </div>

                  <div className={styles.detailBox}>
                    <span>{td.category}</span>
                    <strong>{categoryLabel(doc?.category, td)}</strong>
                  </div>

                  <div className={styles.detailBox}>
                    <span>{td.version}</span>
                    <strong>v{doc?.version ?? 1}</strong>
                  </div>

                  <div className={styles.noticeBox}>
                    <ShieldCheck size={15} />
                    <span>{td.versionNotice}</span>
                  </div>
                </>
              )}
            </aside>

            <section className={styles.uploadPanel}>
              <div className={styles.uploadHead}>
                <h3 className={styles.panelTitle}>{td.newFile}</h3>
                <p>{td.allowedFileTypes}</p>
              </div>

              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className={styles.fileInput}
                  disabled={loading}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />

                <span className={styles.uploadIcon}>
                  <UploadCloud size={34} />
                </span>

                <strong>{file ? file.name : td.chooseReplacementFile}</strong>

                <span>{file ? prettyFileSize(file.size) : td.allowedFileTypes}</span>
              </label>

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

                <button type="submit" className={styles.primaryBtn} disabled={!canSubmit}>
                  {loading ? td.saving : td.replaceDocument}
                </button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </div>
  )
}