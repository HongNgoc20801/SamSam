import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  HeartPulse,
  School,
  ShieldCheck,
  IdCard,
  Shapes,
  Pencil,
} from 'lucide-react'

import styles from './documents.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import { getTranslations } from '@/app/lib/i18n/getTranslations'

const DOCS_SLUG = 'child_documents'

type SearchParams = Promise<{ category?: string }>

type Child = {
  id: string
  fullName: string
}

type Media = {
  id: string
  filename?: string
  filesize?: number
  url?: string
  mimeType?: string
}

type UploadedBy =
  | string
  | {
      id: string
      fullName?: string
      email?: string
      name?: string
      displayName?: string
    }

type ChildDoc = {
  id: string
  title: string
  category?: 'agreement' | 'school' | 'health' | 'id' | 'other'
  noteShort?: string
  createdAt?: string
  version?: number
  file?: string | Media
  uploadedBy?: UploadedBy
  uploadedByName?: string
}

function fmtDate(value?: string | null, fallback = '—') {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return date.toISOString().slice(0, 10)
}

function prettyFileSize(size?: number) {
  if (typeof size !== 'number' || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function fileMeta(file?: string | Media, fallbackFileName = 'file') {
  if (!file || typeof file === 'string') return ''

  const name = file.filename || fallbackFileName
  const size = prettyFileSize(file.filesize)

  return `${name}${size ? ` • ${size}` : ''}`
}

function uploaderLabel(
  doc: ChildDoc,
  labels: { unknownUser: string; familyMember: string }
) {
  if (doc.uploadedByName?.trim()) return doc.uploadedByName.trim()

  const value = doc.uploadedBy

  if (!value) return labels.unknownUser
  if (typeof value === 'string') return labels.familyMember

  return value.fullName || value.name || value.displayName || value.email || labels.unknownUser
}

function categoryHref(childId: string, category: string) {
  if (category === 'all') return `/child-info/${childId}/documents`
  return `/child-info/${childId}/documents?category=${category}`
}

function categoryIcon(category: string) {
  if (category === 'school') return <School size={15} />
  if (category === 'health') return <HeartPulse size={15} />
  if (category === 'agreement') return <ShieldCheck size={15} />
  if (category === 'id') return <IdCard size={15} />
  return <Shapes size={15} />
}

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const t = await getTranslations()
  const td = t.documentsPage

  const CATEGORY_TABS = [
    { label: td.all, value: 'all' },
    { label: td.academic, value: 'school' },
    { label: td.medical, value: 'health' },
    { label: td.consent, value: 'agreement' },
    { label: td.id, value: 'id' },
    { label: td.other, value: 'other' },
  ] as const

  function categoryLabel(category?: ChildDoc['category'] | string) {
    if (category === 'agreement') return td.consent
    if (category === 'school') return td.academic
    if (category === 'health') return td.medical
    if (category === 'id') return td.id
    return td.other
  }

  const { id } = await params
  const sp = await searchParams

  const activeCategory =
    sp?.category && ['school', 'health', 'agreement', 'id', 'other'].includes(sp.category)
      ? sp.category
      : 'all'

  const [childRes, docsRes] = await Promise.all([
    serverFetch(`/api/children/${id}`),
    serverFetch(`/api/${DOCS_SLUG}?limit=200&sort=-createdAt&depth=1&where[child][equals]=${id}`),
  ])

  if (!childRes.ok) return notFound()

  const child: Child | null = await childRes.json().catch(() => null)
  if (!child?.id) return notFound()

  const docsData = docsRes.ok ? await docsRes.json().catch(() => null) : null
  const docs: ChildDoc[] = docsData?.docs ?? []

  const filteredDocs =
    activeCategory === 'all'
      ? docs
      : docs.filter((doc) => (doc.category || 'other') === activeCategory)

  const sectionTitle =
    activeCategory === 'all'
      ? td.allDocuments
      : `${categoryLabel(activeCategory)} ${td.documentsInCategory}`

  const fileCountLabel = filteredDocs.length === 1 ? td.file : td.files

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.headerMain}>
          <div className={styles.breadcrumbRow}>
            <Link href={`/child-info/${id}`} className={styles.backBtn}>
              <ArrowLeft size={16} />
              <span>{td.backToChildInfo}</span>
            </Link>

            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{td.documents}</span>
          </div>

          <div className={styles.titleRow}>
            <h1 className={styles.title}>{child.fullName}</h1>

            <Link className={styles.primaryBtn} href={`/child-info/${id}/documents/new`}>
              {td.addNew}
            </Link>
          </div>
        </div>
      </header>

      <section className={`${styles.card} ${styles.filterCard}`}>
        <div className={styles.filterRow}>
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.value

            return (
              <Link
                key={tab.value}
                href={categoryHref(id, tab.value)}
                className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
              >
                <span className={styles.filterChipIcon}>
                  {tab.value !== 'all' ? categoryIcon(tab.value) : <FileText size={15} />}
                </span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section
        className={`${styles.card} ${
          filteredDocs.length === 0 ? styles.emptyCard : styles.listCard
        }`}
      >
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>{sectionTitle}</div>
            <div className={styles.sectionSub}>
              {filteredDocs.length} {fileCountLabel}
            </div>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyTitle}>{td.noDocumentsFound}</div>
            <div className={styles.emptyText}>{td.noDocumentsInCategory}</div>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredDocs.map((doc) => {
              const meta = fileMeta(doc.file, td.untitledFile)

              return (
                <div key={doc.id} className={styles.row}>
                  <Link
                    href={`/child-info/${id}/documents/${doc.id}`}
                    className={styles.rowMain}
                  >
                    <div className={styles.rowIcon}>
                      <FileText size={15} />
                    </div>

                    <div className={styles.rowBody}>
                      <div className={styles.rowTop}>
                        <div className={styles.rowTitle}>{doc.title}</div>
                      </div>

                      <div className={styles.rowMeta}>
                        <span>{categoryLabel(doc.category)}</span>
                        <span className={styles.dot}>•</span>
                        <span>
                          {td.version}
                          {doc.version ?? 1}
                        </span>
                        <span className={styles.dot}>•</span>
                        <span>{fmtDate(doc.createdAt)}</span>
                        <span className={styles.dot}>•</span>
                        <span>
                          {td.by}{' '}
                          {uploaderLabel(doc, {
                            unknownUser: td.unknownUser,
                            familyMember: td.familyMember,
                          })}
                        </span>
                      </div>

                      {doc.noteShort ? <div className={styles.rowNote}>{doc.noteShort}</div> : null}

                      {meta ? <div className={styles.rowFile}>{meta}</div> : null}
                    </div>
                  </Link>

                  <div className={styles.rowActions}>
                    <Link
                      href={`/child-info/${id}/documents/${doc.id}/edit`}
                      className={styles.iconBtn}
                      aria-label={td.editDocument}
                    >
                      <Pencil size={15} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}