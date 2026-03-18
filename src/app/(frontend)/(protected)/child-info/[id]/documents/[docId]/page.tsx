import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  CalendarDays,
  FolderOpen,
  FileText,
  User,
  Tag,
  StickyNote,
} from 'lucide-react'
import styles from './documentsId.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import DeleteDocumentButton from './DeleteDocumentButton'

const DOCS_SLUG = 'child_documents'

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
      firstName?: string
      lastName?: string
      fullName?: string
      name?: string
      displayName?: string
      email?: string
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

function fmtDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

function uploaderLabel(doc?: ChildDoc | null) {
  if (!doc) return 'Unknown user'

  if (doc.uploadedByName?.trim()) {
    return doc.uploadedByName.trim()
  }

  const v = doc.uploadedBy

  if (!v) return 'Unknown user'
  if (typeof v === 'string') return 'Family member'

  const fullName =
    v.fullName ||
    v.name ||
    v.displayName ||
    [v.firstName, v.lastName].filter(Boolean).join(' ').trim()

  return fullName || v.email || 'Unknown user'
}

function categoryLabel(c?: string) {
  if (c === 'agreement') return 'Consent'
  if (c === 'school') return 'Academic'
  if (c === 'health') return 'Medical'
  if (c === 'id') return 'ID'
  return 'Other'
}

function fileMeta(file?: Media | null) {
  if (!file) return '—'
  const name = file.filename || 'file'
  const size =
    typeof file.filesize === 'number'
      ? `${Math.max(1, Math.round(file.filesize / 1024))} KB`
      : ''
  return `${name}${size ? ` • ${size}` : ''}`
}

function isImage(file?: Media | null) {
  if (!file) return false
  if (file.mimeType?.startsWith('image/')) return true

  const name = file.filename?.toLowerCase() || ''
  return (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    name.endsWith('.bmp') ||
    name.endsWith('.svg')
  )
}

function isPdf(file?: Media | null) {
  if (!file) return false
  if (file.mimeType === 'application/pdf') return true
  return file.filename?.toLowerCase().endsWith('.pdf') ?? false
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>
}) {
  const { id, docId } = await params

  const res = await serverFetch(`/api/${DOCS_SLUG}/${docId}?depth=1`)
  if (!res.ok) return notFound()

  const doc: ChildDoc | null = await res.json().catch(() => null)
  if (!doc?.id) return notFound()

  const file = doc.file && typeof doc.file === 'object' ? doc.file : null
  const fileUrl = file?.url || ''

  const fileType = isImage(file)
    ? 'Image'
    : isPdf(file)
      ? 'PDF document'
      : file?.mimeType || 'File'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={`/child-info/${id}/documents`} className={styles.backBtn}>
            <ArrowLeft size={16} />
            Documents
          </Link>

          <span className={styles.breadcrumbSep}>/</span>

          <h1 className={styles.title}>{doc.title}</h1>
        </div>

        <div className={styles.headerActions}>
          <Link
            href={`/child-info/${id}/documents/${doc.id}/edit`}
            className={styles.editBtn}
          >
            <Pencil size={14} />
            Edit
          </Link>

          <Link
            href={`/child-info/${id}/documents/${doc.id}/replace`}
            className={styles.replaceBtn}
          >
            Replace
          </Link>
        </div>
      </header>

      <div className={styles.contentLayout}>
        <main className={styles.mainPane}>
          <section className={styles.previewCard}>
            <div className={styles.previewHead}>
              <div>
                <div className={styles.previewTitle}>Preview</div>
                <div className={styles.previewSub}>
                  View the uploaded file directly on this page
                </div>
              </div>

              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.inlineLink}
                >
                  <ExternalLink size={15} />
                  Open in new tab
                </a>
              ) : null}
            </div>

            {!fileUrl ? (
              <div className={styles.empty}>No file available.</div>
            ) : isImage(file) ? (
              <div className={styles.filePreviewWrap}>
                <img
                  src={fileUrl}
                  alt={doc.title}
                  className={styles.filePreviewImage}
                />
              </div>
            ) : (
              <div className={styles.filePreviewWrap}>
                <iframe
                  src={fileUrl}
                  title={doc.title}
                  className={styles.filePreviewFrame}
                />
              </div>
            )}
          </section>
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard}>
            <div className={styles.sideTitle}>Document summary</div>
            <div className={styles.sideSub}>Quick overview of this document</div>

            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <Tag size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>Category</div>
                  <div className={styles.summaryValue}>
                    {categoryLabel(doc.category)}
                  </div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <FileText size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>File</div>
                  <div className={styles.summaryValue}>{fileMeta(file)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <FileText size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>Type</div>
                  <div className={styles.summaryValue}>{fileType}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <CalendarDays size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>Uploaded date</div>
                  <div className={styles.summaryValue}>{fmtDate(doc.createdAt)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <User size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>Uploaded by</div>
                  <div className={styles.summaryValue}>{uploaderLabel(doc)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <FolderOpen size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>Version</div>
                  <div className={styles.summaryValue}>v{doc.version ?? 1}</div>
                </div>
              </div>
            </div>

            {doc.noteShort ? (
              <div className={styles.noteBox}>
                <div className={styles.noteHead}>
                  <StickyNote size={15} />
                  <span>Note</span>
                </div>
                <div className={styles.noteText}>{doc.noteShort}</div>
              </div>
            ) : null}
          </section>

          <section className={`${styles.sideCard} ${styles.dangerCard}`}>
            <div className={styles.sideTitle}>Danger zone</div>
            <div className={styles.sideSub}>Delete this document if needed</div>

            <div className={styles.dangerActions}>
              <DeleteDocumentButton
                docId={doc.id}
                childId={id}
                className={styles.deleteBtn}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}