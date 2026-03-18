'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './EditChildDoc.module.css'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

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

function getUploaderLabel(doc?: ChildDoc | null) {
  if (!doc) return 'Family member'

  if (doc.uploadedByName?.trim()) return doc.uploadedByName.trim()

  const uploadedBy = doc.uploadedBy

  if (!uploadedBy) return 'Family member'
  if (typeof uploadedBy === 'string') return 'Family member'

  return (
    uploadedBy.fullName?.trim() ||
    uploadedBy.name?.trim() ||
    uploadedBy.displayName?.trim() ||
    uploadedBy.email?.trim() ||
    'Family member'
  )
}

export default function EditChildDocPage() {
  const router = useRouter()
  const params = useParams<{ id: string; docId: string }>()

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
    return !!childId && !!docId && !!title.trim() && !loading && !loadingInitial
  }, [childId, docId, title, loading, loadingInitial])

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
            extractErrorMessage(raw, json, `Load document failed (${res.status})`)
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
        extractErrorMessage(raw, json, `Update document failed (${res.status})`)
      )
    }

    return json
  }

  async function onSubmit(e: React.FormEvent) {
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
            <h1 className={styles.title}>Edit document</h1>
            <p className={styles.sub}>
              You can update the title, category, and short note.
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
                File replacement is not allowed here. To replace a file, create a new document.
              </div>
            </div>
          </div>

          {loadingInitial ? (
            <div className={styles.infoBox}>Loading document...</div>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Uploaded by</label>
                <div className={styles.infoBox}>{getUploaderLabel(doc)}</div>
              </div>

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
              Cancel
            </button>

            <button type="submit" className={styles.primaryBtn} disabled={!canSubmit}>
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}