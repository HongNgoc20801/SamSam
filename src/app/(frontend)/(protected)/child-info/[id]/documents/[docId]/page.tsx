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
import { getTranslations } from '@/app/lib/i18n/getTranslations'

const DOCS_SLUG = 'child_documents'

type ProfileStatus = 'active' | 'inactive' | 'archived'

type Child = {
  id: string
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

function normalizeProfileStatus(s?: string): ProfileStatus {
  const v = String(s || '').toLowerCase()
  if (v === 'inactive') return 'inactive'
  if (v === 'archived') return 'archived'
  return 'active'
}

function fmtDate(v?: string | null, empty = '—') {
  if (!v) return empty
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return empty
  return d.toISOString().slice(0, 10)
}

function uploaderLabel(
  doc: ChildDoc | null | undefined,
  labels: { unknownUser: string; familyMember: string },
) {
  if (!doc) return labels.unknownUser
  if (doc.uploadedByName?.trim()) return doc.uploadedByName.trim()

  const v = doc.uploadedBy
  if (!v) return labels.unknownUser
  if (typeof v === 'string') return labels.familyMember

  const fullName =
    v.fullName ||
    v.name ||
    v.displayName ||
    [v.firstName, v.lastName].filter(Boolean).join(' ').trim()

  return fullName || v.email || labels.unknownUser
}

function categoryLabel(
  c: ChildDoc['category'] | undefined,
  t: {
    categoryAgreement: string
    categorySchool: string
    categoryHealth: string
    categoryId: string
    categoryOther: string
  },
) {
  if (c === 'agreement') return t.categoryAgreement
  if (c === 'school') return t.categorySchool
  if (c === 'health') return t.categoryHealth
  if (c === 'id') return t.categoryId
  return t.categoryOther
}

function prettyFileSize(size?: number) {
  if (typeof size !== 'number' || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function fileMeta(
  file: Media | null | undefined,
  labels: { untitledFile: string; noValue: string },
) {
  if (!file) return labels.noValue
  const name = file.filename || labels.untitledFile
  const size = prettyFileSize(file.filesize)
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
  const t = await getTranslations()
  const td = t.documentDetail

  const { id, docId } = await params

  const [docRes, childRes] = await Promise.all([
    serverFetch(`/api/${DOCS_SLUG}/${docId}?depth=1`),
    serverFetch(`/api/children/${id}?depth=0`),
  ])

  if (!docRes.ok || !childRes.ok) return notFound()

  const doc: ChildDoc | null = await docRes.json().catch(() => null)
  const child: Child | null = await childRes.json().catch(() => null)

  if (!doc?.id || !child?.id) return notFound()

  const profileStatus = normalizeProfileStatus(child.profileStatus)
  const isArchived = profileStatus === 'archived'

  const file = doc.file && typeof doc.file === 'object' ? doc.file : null
  const fileUrl = file?.url || ''

  const fileType = isImage(file)
    ? td.imageType
    : isPdf(file)
      ? td.pdfType
      : file?.mimeType || td.genericFileType

  return (
    <div className={styles.page}>
      <header className={styles.header}>
  <div className={styles.headerLeft}>
    <Link href={`/child-info/${id}/documents`} className={styles.backBtn}>
      <ArrowLeft size={16} />
      {td.backToDocuments}
    </Link>

    <span className={styles.breadcrumbSep}>/</span>

    <h1 className={styles.title}>{doc.title}</h1>
  </div>

  {!isArchived ? (
    <div className={styles.headerActions}>
      <Link href={`/child-info/${id}/documents/${doc.id}/edit`} className={styles.editBtn}>
        <Pencil size={15} />
        {td.edit}
      </Link>

      <Link href={`/child-info/${id}/documents/${doc.id}/replace`} className={styles.replaceBtn}>
        {td.replace}
      </Link>
    </div>
  ) : null}
</header>

      <div className={styles.contentLayout}>
        <main className={styles.mainPane}>
          <section className={styles.previewCard}>
            <div className={styles.previewHead}>
              <div>
                <div className={styles.previewTitle}>{td.preview}</div>
                <div className={styles.previewSub}>{td.previewHint}</div>
              </div>

              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.inlineLink}
                >
                  <ExternalLink size={15} />
                  {td.openInNewTab}
                </a>
              ) : null}
            </div>

            {!fileUrl ? (
              <div className={styles.empty}>{td.noFileAvailable}</div>
            ) : isImage(file) ? (
              <div className={styles.filePreviewWrap}>
                <img src={fileUrl} alt={doc.title} className={styles.filePreviewImage} />
              </div>
            ) : (
              <div className={styles.filePreviewWrap}>
                <iframe src={fileUrl} title={doc.title} className={styles.filePreviewFrame} />
              </div>
            )}
          </section>
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard}>
            <div className={styles.sideTitle}>{td.summaryTitle}</div>
            <div className={styles.sideSub}>{td.summaryHint}</div>

            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <Tag size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>{td.category}</div>
                  <div className={styles.summaryValue}>{categoryLabel(doc.category, td)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <FileText size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>{td.file}</div>
                  <div className={styles.summaryValue}>{fileMeta(file, td)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <FileText size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>{td.type}</div>
                  <div className={styles.summaryValue}>{fileType}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <CalendarDays size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>{td.uploadedDate}</div>
                  <div className={styles.summaryValue}>{fmtDate(doc.createdAt, td.noValue)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <User size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>{td.uploadedBy}</div>
                  <div className={styles.summaryValue}>{uploaderLabel(doc, td)}</div>
                </div>
              </div>

              <div className={styles.summaryItem}>
                <div className={styles.summaryIcon}>
                  <FolderOpen size={15} />
                </div>
                <div className={styles.summaryContent}>
                  <div className={styles.summaryLabel}>{td.version}</div>
                  <div className={styles.summaryValue}>v{doc.version ?? 1}</div>
                </div>
              </div>
            </div>

            {doc.noteShort ? (
              <div className={styles.noteBox}>
                <div className={styles.noteHead}>
                  <StickyNote size={15} />
                  <span>{td.note}</span>
                </div>
                <div className={styles.noteText}>{doc.noteShort}</div>
              </div>
            ) : null}
          </section>

          {!isArchived ? (
            <section className={`${styles.sideCard} ${styles.dangerCard}`}>
              <div className={styles.sideTitle}>{td.dangerTitle}</div>
              <div className={styles.sideSub}>{td.dangerHint}</div>

              <div className={styles.dangerActions}>
                <DeleteDocumentButton docId={doc.id} childId={id} className={styles.deleteBtn} />
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}