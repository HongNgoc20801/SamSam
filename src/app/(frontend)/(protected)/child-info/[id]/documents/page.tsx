import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowDownToLine,
  Archive,
  ArrowLeft,
  FileText,
  HeartPulse,
  School,
  ShieldCheck,
  IdCard,
  Shapes,
  Pencil,
  Plus,
} from 'lucide-react'

import styles from './documents.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import { getTranslations } from '@/app/lib/i18n/getTranslations'

const DOCS_SLUG = 'child_documents'

type SearchParams = Promise<{ category?: string }>
type ProfileStatus = 'active' | 'inactive' | 'archived'

type Child = {
  id: string
  fullName: string
  profileStatus?: ProfileStatus | string
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

function normalizeProfileStatus(s?: string): ProfileStatus {
  const v = String(s || '').toLowerCase()
  if (v === 'inactive') return 'inactive'
  if (v === 'archived') return 'archived'
  return 'active'
}

function fmtDate(value?: string | null, fallback = '—') {
  if (!value) return fallback

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

function fileUrl(file?: string | Media) {
  if (!file || typeof file === 'string') return ''
  return file.url || ''
}

function uploaderLabel(doc: ChildDoc, labels: { unknownUser: string; familyMember: string }) {
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

function categoryIcon(category: string, size = 15) {
  if (category === 'school') return <School size={size} />
  if (category === 'health') return <HeartPulse size={size} />
  if (category === 'agreement') return <ShieldCheck size={size} />
  if (category === 'id') return <IdCard size={size} />
  if (category === 'all') return <FileText size={size} />
  return <Shapes size={size} />
}

function categoryClass(category?: string) {
  if (category === 'school') return styles.catSchool
  if (category === 'health') return styles.catHealth
  if (category === 'agreement') return styles.catAgreement
  if (category === 'id') return styles.catId
  return styles.catOther
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

  const profileStatus = normalizeProfileStatus(child.profileStatus)
  const isArchived = profileStatus === 'archived'

  const docsData = docsRes.ok ? await docsRes.json().catch(() => null) : null
  const docs: ChildDoc[] = docsData?.docs ?? []

  function categoryLabel(category?: ChildDoc['category'] | string) {
    if (category === 'agreement') return td.consent
    if (category === 'school') return td.academic
    if (category === 'health') return td.medical
    if (category === 'id') return td.id
    return td.other
  }

  const CATEGORY_TABS = [
    { label: td.all, value: 'all' },
    { label: td.academic, value: 'school' },
    { label: td.medical, value: 'health' },
    { label: td.consent, value: 'agreement' },
    { label: td.id, value: 'id' },
    { label: td.other, value: 'other' },
  ] as const

  const filteredDocs =
    activeCategory === 'all'
      ? docs
      : docs.filter((doc) => (doc.category || 'other') === activeCategory)

  const fileCountLabel = filteredDocs.length === 1 ? td.file : td.files

  const sectionTitle =
    activeCategory === 'all'
      ? td.allDocuments
      : `${categoryLabel(activeCategory)} ${td.documentsInCategory}`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
  <div className={styles.headerTop}>
    <Link href={`/child-info/${id}`} className={styles.backLink}>
      <ArrowLeft size={16} />
      {td.backToChildInfo}
    </Link>

    <div className={styles.breadcrumb}>
      <Link href="/child-info" className={styles.breadcrumbLink}>
        {td.children}
      </Link>
      <span>›</span>
      <Link href={`/child-info/${id}`} className={styles.breadcrumbLink}>
        {child.fullName}
      </Link>
      <span>›</span>
      <span className={styles.breadcrumbCurrent}>{td.documents}</span>
    </div>
  </div>

  <div className={styles.headerMain}>
    <div>
      <h1 className={styles.title}>{td.documents}</h1>
    </div>

    {isArchived ? (
      <span className={styles.disabledBtn}>
        <Archive size={15} />
        {td.archived}
      </span>
    ) : (
      <Link className={styles.primaryBtn} href={`/child-info/${id}/documents/new`}>
        <Plus size={16} />
        {td.addNew}
      </Link>
    )}
  </div>

  {isArchived ? <div className={styles.archivedNotice}>{td.archivedNotice}</div> : null}
</header>
      <nav className={styles.filterRow}>
        {CATEGORY_TABS.map((tab) => {
          const active = activeCategory === tab.value

          return (
            <Link
              key={tab.value}
              href={categoryHref(id, tab.value)}
              className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
            >
              {categoryIcon(tab.value)}
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      <section className={styles.documentsCard}>
        <div className={styles.listHeader}>
          <div>
            <div className={styles.sectionTitle}>{sectionTitle}</div>
            <div className={styles.sectionSub}>
              {filteredDocs.length} {fileCountLabel}
            </div>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FileText size={24} />
            </div>

            <div>
              <div className={styles.emptyTitle}>{td.noDocumentsFound}</div>
              <div className={styles.emptyText}>{td.noDocumentsInCategory}</div>
            </div>

            {!isArchived ? (
              <Link className={styles.emptyAction} href={`/child-info/${id}/documents/new`}>
                <Plus size={15} />
                {td.addNew}
              </Link>
            ) : null}
          </div>
        ) : (
          <div className={styles.list}>
            {filteredDocs.map((doc) => {
              const meta = fileMeta(doc.file, td.untitledFile)
              const downloadUrl = fileUrl(doc.file)
              const cat = doc.category || 'other'

              return (
                <article key={doc.id} className={styles.docRow}>
                  <Link href={`/child-info/${id}/documents/${doc.id}`} className={styles.docMain}>
                    <div className={`${styles.docIcon} ${categoryClass(cat)}`}>
                      {categoryIcon(cat, 20)}
                    </div>

                    <div className={styles.docBody}>
                      <div className={styles.docTop}>
                        <h2 className={styles.docTitle}>{doc.title}</h2>

                        <span className={`${styles.categoryBadge} ${categoryClass(cat)}`}>
                          {categoryLabel(cat)}
                        </span>
                      </div>

                      <div className={styles.docMeta}>
                        <span>
                          {td.version}
                          {doc.version ?? 1}
                        </span>
                        <span>•</span>
                        <span>{fmtDate(doc.createdAt)}</span>
                        <span>•</span>
                        <span>
                          {td.by}{' '}
                          {uploaderLabel(doc, {
                            unknownUser: td.unknownUser,
                            familyMember: td.familyMember,
                          })}
                        </span>
                      </div>

                      {doc.noteShort ? <p className={styles.docNote}>{doc.noteShort}</p> : null}
                      {meta ? <div className={styles.docFile}>{meta}</div> : null}
                    </div>
                  </Link>

                  <div className={styles.docActions}>
                    {downloadUrl ? (
                      <a className={styles.downloadBtn} href={downloadUrl} download>
                        <ArrowDownToLine size={14} />
                        {td.download}
                      </a>
                    ) : null}

                    {!isArchived ? (
                      <Link
                        href={`/child-info/${id}/documents/${doc.id}/edit`}
                        className={styles.editBtn}
                        aria-label={td.editDocument}
                      >
                        <Pencil size={15} />
                      </Link>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}