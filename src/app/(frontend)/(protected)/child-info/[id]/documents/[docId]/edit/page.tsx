'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import styles from './EditChildDoc.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

const DOCS_SLUG = 'child_documents'

type Category = 'agreement' | 'school' | 'health' | 'id' | 'other'

type UserRef =
  | string
  | {
      id: string
      fullName?: string
      name?: string
      displayName?: string
      email?: string
    }

type ChildDoc = {
  id: string
  title: string
  category?: Category
  noteShort?: string
  uploadedBy?: UserRef
  uploadedByName?: string
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

export default function EditChildDocPage() {
  const router = useRouter()
  const params = useParams<{ id: string; docId: string }>()
  const t = useTranslations()
  const td = t.editChildDoc

  const childId = params?.id
  const docId = params?.docId

  const [doc, setDoc] = useState<ChildDoc | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [noteShort, setNoteShort] = useState('')

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return Boolean(childId && docId && title.trim() && !loading && !loadingInitial)
  }, [childId, docId, title, loading, loadingInitial])

  function getUploaderLabel(value?: ChildDoc | null) {
    if (!value) return td.familyMember

    if (value.uploadedByName?.trim()) return value.uploadedByName.trim()

    const uploadedBy = value.uploadedBy

    if (!uploadedBy) return td.familyMember
    if (typeof uploadedBy === 'string') return td.familyMember

    return (
      uploadedBy.fullName?.trim() ||
      uploadedBy.name?.trim() ||
      uploadedBy.displayName?.trim() ||
      uploadedBy.email?.trim() ||
      td.familyMember
    )
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
            extractErrorMessage(raw, json, td.failedToLoadDocument)
          )
        }

        const docData = json as ChildDoc

        if (!cancelled) {
          setDoc(docData)
          setTitle(docData?.title || '')
          setCategory(docData?.category || 'other')
          setNoteShort(docData?.noteShort || '')
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

  async function updateChildDocument(input: {
    title: string
    category: Category
    noteShort?: string
  }) {
    const res = await fetch(`/api/${DOCS_SLUG}/${docId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const raw = await res.text()
    const json = safeJsonParse(raw)

    if (!res.ok) {
      throw new Error(
        extractErrorMessage(raw, json, td.updateDocumentFailed)
      )
    }

    return json
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || !childId || !docId) return

    setError('')
    setLoading(true)

    try {
      const payload = {
        title: title.trim(),
        category,
        noteShort: noteShort.trim() || undefined,
      }

      await updateChildDocument(payload)

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

          {loadingInitial ? (
            <div className={styles.infoBox}>{td.loadingDocument}</div>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label}>{td.uploadedBy}</label>
                <div className={styles.infoBox}>{getUploaderLabel(doc)}</div>
              </div>

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
            </>
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
              {loading ? td.saving : td.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}