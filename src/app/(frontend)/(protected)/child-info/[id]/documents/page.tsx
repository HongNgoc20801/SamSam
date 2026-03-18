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

const CATEGORY_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Academic', value: 'school' },
  { label: 'Medical', value: 'health' },
  { label: 'Consent', value: 'agreement' },
  { label: 'ID', value: 'id' },
  { label: 'Other', value: 'other' },
] as const

function fmtDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

function categoryLabel(c?: ChildDoc['category'] | string) {
  if (c === 'agreement') return 'Consent'
  if (c === 'school') return 'Academic'
  if (c === 'health') return 'Medical'
  if (c === 'id') return 'ID'
  return 'Other'
}

function fileMeta(file?: string | Media) {
  if (!file || typeof file === 'string') return ''

  const name = file.filename || 'file'
  const size =
    typeof file.filesize === 'number'
      ? `${Math.max(1, Math.round(file.filesize / 1024))} KB`
      : ''

  return `${name}${size ? ` • ${size}` : ''}`
}

function uploaderLabel(doc: ChildDoc) {
  if (doc.uploadedByName) return doc.uploadedByName

  const v = doc.uploadedBy
  if (!v) return 'Unknown user'
  if (typeof v === 'string') return 'Family member'

  const anyV = v as any
  return anyV.fullName || anyV.name || anyV.displayName || anyV.email || 'Unknown user'
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
      : docs.filter((d) => (d.category || 'other') === activeCategory)

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.headerMain}>
          <div className={styles.breadcrumbRow}>
            <Link href={`/child-info/${id}`} className={styles.backBtn}>
              <ArrowLeft size={16} />
              <span>Child info</span>
            </Link>

            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Documents</span>
          </div>

          <div className={styles.titleRow}>
            <h1 className={styles.title}>{child.fullName}</h1>

            <Link className={styles.primaryBtn} href={`/child-info/${id}/documents/new`}>
              Add New
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
            <div className={styles.sectionTitle}>
              {activeCategory === 'all'
                ? 'All documents'
                : `${categoryLabel(activeCategory)} documents`}
            </div>
            <div className={styles.sectionSub}>
              {filteredDocs.length} file{filteredDocs.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyTitle}>No documents found</div>
            <div className={styles.emptyText}>
              There are no documents in this category yet.
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredDocs.map((doc) => (
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
                      <span>v{doc.version ?? 1}</span>
                      <span className={styles.dot}>•</span>
                      <span>{fmtDate(doc.createdAt)}</span>
                      <span className={styles.dot}>•</span>
                      <span>By {uploaderLabel(doc)}</span>
                    </div>

                    {doc.noteShort ? <div className={styles.rowNote}>{doc.noteShort}</div> : null}

                    {fileMeta(doc.file) ? (
                      <div className={styles.rowFile}>{fileMeta(doc.file)}</div>
                    ) : null}
                  </div>
                </Link>

                <div className={styles.rowActions}>
                  <Link
                    href={`/child-info/${id}/documents/${doc.id}/edit`}
                    className={styles.iconBtn}
                    aria-label="Edit document"
                  >
                    <Pencil size={15} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}