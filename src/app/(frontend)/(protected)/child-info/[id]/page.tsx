import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './childDetail.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import ConfirmChildButton from './ConfirmChildButton'
import { getTranslations } from '@/app/lib/i18n/getTranslations'

import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  ClipboardList,
  FileText,
  HeartPulse,
  Phone,
  ShieldCheck,
  Upload,
  Pencil,
  UserRound,
  School,
  IdCard,
  Shapes,
} from 'lucide-react'

const DOCS_SLUG = 'child_documents'
const AUDIT_SLUG = 'audit_logs'
const LATEST_AUDIT_LIMIT = 5

type Media = {
  id?: string
  url?: string
  filename?: string
  thumbnailURL?: string
  sizes?: {
    thumbnail?: {
      url?: string
    }
  }
}

type PhoneT = { value: string }

type EmergencyContact = {
  name: string
  relation?: string
  isPrimary?: boolean
  phones?: PhoneT[]
  note?: string
}

type Child = {
  id: string
  fullName: string
  birthDate?: string
  gender?: string
  nationalId?: string
  status?: 'pending' | 'confirmed' | string
  createdBy?: any
  confirmedAt?: string | null
  avatar?: Media | string | null

  school?: {
    schoolName?: string
    className?: string
    mainTeacher?: string
  }

  medical?: {
    bloodType?: string
    allergies?: { value: string }[]
    conditions?: { value: string }[]
    medications?: { value: string }[]
    notesShort?: string
    emergencyInstruction?: string
    gp?: {
      name?: string
      clinic?: string
      phones?: PhoneT[]
    }
  }

  emergencyContacts?: EmergencyContact[]
}

type ChildDoc = {
  id: string
  title: string
  category?: 'agreement' | 'school' | 'health' | 'id' | 'other'
  createdAt?: string
  version?: number
}

type AuditLog = {
  id: string
  action: string
  createdAt?: string
  targetLabel?: string
  meta?: {
    childName?: string
    documentTitle?: string
    documentCategory?: string
    version?: number
    status?: string
    previousStatus?: string
    wasResetToPending?: boolean
    changedFields?: string[]
    title?: string
    type?: string
    [key: string]: any
  }
  actorId?: string
  actorName?: string
  actorType?: 'customer' | 'admin' | 'system'
  summary?: string
  entityType?: 'child' | 'document' | 'event' | 'post' | 'other'
  changes?: { field: string; from?: string; to?: string }[]
}

type CalEvent = {
  id: string
  title: string
  startAt: string
  endAt: string
  notes?: string
}

function calcAge(birthDate?: string) {
  if (!birthDate) return null

  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()

  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--

  return age
}

function normalizeStatus(s?: string) {
  const v = String(s || '').toLowerCase()
  return v.includes('confirm') ? 'confirmed' : 'pending'
}

function normalizeMediaUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return url
  return `/${url}`
}

function getAvatarUrl(avatar: Child['avatar']): string {
  if (!avatar || typeof avatar === 'string') return ''

  if (typeof avatar.url === 'string' && avatar.url.trim()) {
    return normalizeMediaUrl(avatar.url)
  }

  if (typeof avatar.thumbnailURL === 'string' && avatar.thumbnailURL.trim()) {
    return normalizeMediaUrl(avatar.thumbnailURL)
  }

  if (typeof avatar?.sizes?.thumbnail?.url === 'string' && avatar.sizes.thumbnail.url.trim()) {
    return normalizeMediaUrl(avatar.sizes.thumbnail.url)
  }

  if (typeof avatar.filename === 'string' && avatar.filename.trim()) {
    return `/api/media/file/${avatar.filename}`
  }

  return ''
}

function renderPhones(phones?: PhoneT[], fallback = '—') {
  const list = (phones || [])
    .map((p) => String(p?.value || '').trim())
    .filter(Boolean)

  if (!list.length) return fallback
  return list.join(' • ')
}

function getLocaleFromMessages(t: any): 'nb-NO' | 'en-GB' {
  return t?.calendar?.title === 'Kalender' ? 'nb-NO' : 'en-GB'
}

function fmtDate(v?: string | null, locale = 'nb-NO') {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString(locale, {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function fmtDateTime(v?: string | null, locale = 'nb-NO') {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleString(locale, {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function fmtMonth(v?: string | null, locale = 'nb-NO') {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString(locale, {
    timeZone: 'Europe/Oslo',
    month: '2-digit',
  })
}

function fmtDay(v?: string | null, locale = 'nb-NO') {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString(locale, {
    timeZone: 'Europe/Oslo',
    day: '2-digit',
  })
}

function categoryLabel(c?: ChildDoc['category'] | string, t?: any) {
  if (c === 'agreement') return t.childDetail.consentCategory
  if (c === 'school') return t.childDetail.academicCategory
  if (c === 'health') return t.childDetail.medicalCategory
  if (c === 'id') return t.childDetail.idCategory
  return t.childDetail.otherCategory
}

function eventStatusLabel(v?: string, t?: any) {
  const s = String(v || '').toLowerCase()

  if (!s) return ''
  if (s === 'admin') return t.childDetail.admin
  if (s === 'personal') return t.childDetail.personal
  if (s === 'important') return t.childDetail.importantStatus
  if (s === 'child') return t.childDetail.childStatus

  return v || ''
}

function actorDisplayName(a: AuditLog, t?: any) {
  const raw = String(a?.actorName || '').trim()

  if (raw) {
    if (raw.includes('@')) return raw.split('@')[0]
    return raw
  }

  if (a?.actorType === 'system') return t.childDetail.system
  return a?.actorId || t.childDetail.unknownUser
}

function actionTone(action?: string) {
  const a = String(action || '').toLowerCase()
  if (a.includes('confirm')) return 'confirm'
  if (a.includes('create')) return 'create'
  if (a.includes('upload')) return 'upload'
  if (a.includes('replace')) return 'replace'
  if (a.includes('delete')) return 'delete'
  if (a.includes('update')) return 'update'
  return 'default'
}

function actionLabel(action?: string, t?: any) {
  const a = String(action || '').toLowerCase()
  if (a.includes('confirm')) return t.childDetail.confirmedAction
  if (a.includes('create')) return t.childDetail.created
  if (a.includes('upload')) return t.childDetail.uploaded
  if (a.includes('replace')) return t.childDetail.replaced
  if (a.includes('delete')) return t.childDetail.deleted
  if (a.includes('update')) return t.childDetail.updated
  return t.childDetail.activity
}

function entityLabel(entityType?: string, t?: any) {
  if (entityType === 'child') return t.childDetail.child
  if (entityType === 'document') return t.childDetail.document
  if (entityType === 'event') return t.childDetail.event
  if (entityType === 'post') return t.childDetail.post
  return t.childDetail.otherEntity
}

function buildEventSub(meta: any, t: any, locale: string, changesCount = 0) {
  const parts: string[] = []

  if (meta?.childName) {
    parts.push(`${t.childDetail.forChild} ${meta.childName}`)
  }

  if (meta?.startAt && meta?.endAt) {
    parts.push(`${fmtDateTime(meta.startAt, locale)} → ${fmtDateTime(meta.endAt, locale)}`)
  }

  const status = eventStatusLabel(meta?.status, t)
  const prevStatus = eventStatusLabel(meta?.previousStatus, t)

  if (status && prevStatus && status !== prevStatus) {
    parts.push(`${prevStatus} → ${status}`)
  } else if (status) {
    parts.push(status)
  }

  if (!parts.length && changesCount > 0) {
    parts.push(`${changesCount} ${t.childDetail.fieldsChanged}`)
  }

  return parts.join(' • ')
}

function getAuditPostTarget(a: AuditLog) {
  const meta = a.meta || {}
  return meta?.title || a.targetLabel || ''
}

function auditPretty(a: AuditLog, t: any, locale: string) {
  const action = String(a.action || '').toLowerCase()
  const meta = a.meta || {}
  const changes = Array.isArray(a.changes) ? a.changes : []

  if (action === 'child.create') {
    return {
      sentence: t.childDetail.createdChildProfile,
      target: meta?.childName || '',
      sub: '',
      tone: 'create',
    }
  }

  if (action === 'child.confirm') {
    return {
      sentence: t.childDetail.confirmedChildProfile,
      target: meta?.childName || '',
      sub: '',
      tone: 'confirm',
    }
  }

  if (action === 'child.update') {
    const resetNotice = meta?.wasResetToPending
      ? t.childDetail.resetConfirmationNotice
      : `${changes.length} ${t.childDetail.fieldsChanged}`

    return {
      sentence: t.childDetail.updatedChildProfile,
      target: meta?.childName || '',
      sub: resetNotice,
      tone: 'update',
    }
  }

  if (action === 'event.create') {
    return {
      sentence: t.childDetail.createdCalendarEvent,
      target: meta?.title || '',
      sub: buildEventSub(meta, t, locale),
      tone: 'create',
    }
  }

  if (action === 'event.update') {
    return {
      sentence: t.childDetail.updatedCalendarEvent,
      target: meta?.title || '',
      sub: buildEventSub(meta, t, locale, changes.length),
      tone: 'update',
    }
  }

  if (action === 'event.delete') {
    return {
      sentence: t.childDetail.deletedCalendarEvent,
      target: meta?.title || '',
      sub: buildEventSub(meta, t, locale),
      tone: 'delete',
    }
  }

  if (action === 'doc.upload') {
    return {
      sentence: t.childDetail.uploadedDocument,
      target: meta?.documentTitle || '',
      sub: meta?.documentCategory
        ? `${categoryLabel(meta.documentCategory, t)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
      tone: 'upload',
    }
  }

  if (action === 'doc.replace') {
    return {
      sentence: t.childDetail.replacedDocument,
      target: meta?.documentTitle || '',
      sub: meta?.documentCategory
        ? `${categoryLabel(meta.documentCategory, t)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
      tone: 'replace',
    }
  }

  if (action === 'doc.update') {
    return {
      sentence: t.childDetail.updatedDocument,
      target: meta?.documentTitle || '',
      sub:
        changes.length > 0
          ? `${changes.length} ${t.childDetail.fieldsChanged}`
          : meta?.documentCategory
            ? `${categoryLabel(meta.documentCategory, t)} • v${meta?.version ?? 1}`
            : `v${meta?.version ?? 1}`,
      tone: 'update',
    }
  }

  if (action === 'doc.delete') {
    return {
      sentence: t.childDetail.deletedDocument,
      target: meta?.documentTitle || '',
      sub: meta?.documentCategory
        ? `${categoryLabel(meta.documentCategory, t)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
      tone: 'delete',
    }
  }

  if (action === 'post.create') {
    return {
      sentence: t.childDetail.createdFamilyPost,
      target: getAuditPostTarget(a),
      sub: meta?.type === 'child-update' ? t.childDetail.childUpdate : t.childDetail.generalPost,
      tone: 'create',
    }
  }

  if (action === 'post.update') {
    const importantChanged = changes.some((c) => c.field === 'important')

    return {
      sentence: t.childDetail.updatedFamilyPost,
      target: getAuditPostTarget(a),
      sub: importantChanged
        ? t.childDetail.importanceChanged
        : changes.length > 0
          ? `${changes.length} ${t.childDetail.fieldsChanged}`
          : meta?.type === 'child-update'
            ? t.childDetail.childUpdate
            : t.childDetail.generalPost,
      tone: 'update',
    }
  }

  if (action === 'post.delete') {
    return {
      sentence: t.childDetail.deletedFamilyPost,
      target: getAuditPostTarget(a),
      sub: meta?.type === 'child-update' ? t.childDetail.childUpdate : t.childDetail.generalPost,
      tone: 'delete',
    }
  }

  if (action === 'post.like') {
    return {
      sentence: t.childDetail.likedPost,
      target: getAuditPostTarget(a),
      sub: '',
      tone: 'default',
    }
  }

  if (action === 'post.unlike') {
    return {
      sentence: t.childDetail.removedLikeFromPost,
      target: getAuditPostTarget(a),
      sub: '',
      tone: 'default',
    }
  }

  if (action === 'post.comment.create') {
    return {
      sentence: t.childDetail.commentedOnPost,
      target: getAuditPostTarget(a),
      sub: '',
      tone: 'default',
    }
  }

  return {
    sentence: a.summary || a.action || t.childDetail.didActivity,
    target:
      meta?.title ||
      a.targetLabel ||
      meta?.documentTitle ||
      meta?.childName ||
      '',
    sub: '',
    tone: 'default',
  }
}

function fieldLabel(field?: string, t?: any) {
  const f = String(field || '').trim()

  const map: Record<string, string> = {
    fullName: t.childDetail.fullName,
    birthDate: t.childDetail.dateOfBirth,
    gender: t.childDetail.gender,
    nationalId: t.childDetail.nationalId,
    status: t.childDetail.status,
    avatar: t.childDetail.avatar,

    emergencyContacts: t.childDetail.emergencyContactsField,

    'school.schoolName': t.childDetail.schoolName,
    'school.className': t.childDetail.className,
    'school.mainTeacher': t.childDetail.mainTeacher,

    'medical.bloodType': t.childDetail.bloodType,
    'medical.notesShort': t.childDetail.medicalNote,
    'medical.emergencyInstruction': t.childDetail.emergencyInstruction,
    'medical.allergies': t.childDetail.allergies,
    'medical.conditions': t.childDetail.conditions,
    'medical.medications': t.childDetail.medications,
    'medical.gp': t.childDetail.doctorInfo,

    title: t.childDetail.title,
    content: t.childDetail.content,
    important: t.childDetail.important,
    type: t.childDetail.type,

    category: t.childDetail.category,
    noteShort: t.childDetail.shortNote,
    child: t.childDetail.childField,
    startAt: t.childDetail.startTime,
    endAt: t.childDetail.endTime,
    notes: t.childDetail.notes,
    allDay: t.childDetail.allDay,
  }

  return map[f] || f || 'Field'
}

function renderChangeValue(v?: string, t?: any) {
  const value = String(v ?? '').trim()
  if (!value) return '—'

  if (
    value.startsWith('[{') ||
    value.startsWith('{"') ||
    value.startsWith('[') ||
    value.startsWith('{')
  ) {
    if (value.length > 80) return t.childDetail.structuredDataUpdated
  }

  if (value.length > 120) return `${value.slice(0, 120)}…`
  return value
}

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const t = await getTranslations()
  const locale = getLocaleFromMessages(t)

  const childRes = await serverFetch(`/api/children/${id}?depth=1`)
  if (!childRes.ok) return notFound()

  const child: Child | null = await childRes.json().catch(() => null)
  if (!child?.id) return notFound()

  const nowISO = new Date().toISOString()

  const [docsRes, auditRes, eventsRes] = await Promise.all([
    serverFetch(`/api/${DOCS_SLUG}?limit=200&sort=-createdAt&where[child][equals]=${id}`),
    serverFetch(
      `/api/${AUDIT_SLUG}?limit=${LATEST_AUDIT_LIMIT}&sort=-createdAt&where[child][equals]=${id}&where[visibleInFamilyTimeline][equals]=true`,
    ),
    serverFetch(
      `/api/calendar-events?limit=200&sort=startAt&where[child][equals]=${id}&where[startAt][greater_than]=${encodeURIComponent(nowISO)}`,
    ),
  ])

  const docsData = docsRes.ok ? await docsRes.json().catch(() => null) : null
  const auditData = auditRes.ok ? await auditRes.json().catch(() => null) : null
  const eventsData = eventsRes.ok ? await eventsRes.json().catch(() => null) : null

  const docs: ChildDoc[] = docsData?.docs ?? []
  const audits: AuditLog[] = auditData?.docs ?? []
  const events: CalEvent[] = eventsData?.docs ?? []

  const status = normalizeStatus(child.status)
  const age = calcAge(child.birthDate)
  const initial = (child.fullName?.trim()?.[0] || 'C').toUpperCase()
  const avatarUrl = getAvatarUrl(child.avatar)

  const allergies = child?.medical?.allergies?.map((x) => x.value).filter(Boolean) ?? []
  const conditions = child?.medical?.conditions?.map((x) => x.value).filter(Boolean) ?? []
  const medications = child?.medical?.medications?.map((x) => x.value).filter(Boolean) ?? []

  const emergency = Array.isArray(child.emergencyContacts) ? child.emergencyContacts : []
  const primary = emergency.find((c) => c.isPrimary) || emergency[0]

  const counts = { school: 0, health: 0, agreement: 0, id: 0, other: 0 }
  for (const d of docs) {
    const k = (d.category || 'other') as keyof typeof counts
    counts[k] = (counts[k] || 0) + 1
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.breadcrumb}>
          <Link href="/child-info" className={styles.backBtn}>
            <ArrowLeft size={18} />
            <span>{t.childDetail.back}</span>
          </Link>

          <span className={styles.bcSep}>/</span>
          <span className={styles.bcStrong}>{child.fullName}</span>
        </div>

        <div className={styles.topActions}>
          <Link className={styles.iconBtn} href={`/child-info/${id}/edit`} aria-label={t.childDetail.edit}>
            <Pencil size={18} />
          </Link>
          <Link
            className={styles.iconBtn}
            href={`/child-info/${id}/documents/new`}
            aria-label={t.childDetail.uploadDocument}
          >
            <Upload size={18} />
          </Link>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.leftCol}>
          <section className={styles.profileCard}>
            <div className={styles.avatarCircle}>
              {avatarUrl ? (
                <img
                  className={styles.avatarImg}
                  src={avatarUrl}
                  alt={t.childDetail.avatarAlt ?? 'Child avatar'}
                />
              ) : (
                <span className={styles.avatarFallback}>{initial}</span>
              )}
            </div>

            <div className={styles.profileName}>{child.fullName}</div>

            <div className={styles.profileStatusRow}>
              <span
                className={`${styles.statusPill} ${
                  status === 'confirmed' ? styles.statusOk : styles.statusWarn
                }`}
              >
                {status === 'confirmed' ? (
                  <>
                    <ShieldCheck size={14} /> {t.childDetail.confirmed}
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> {t.childDetail.pending}
                  </>
                )}
              </span>

              {child.confirmedAt ? (
                <span className={styles.profileMetaDim}>
                  {t.childDetail.confirmedAt} {fmtDateTime(child.confirmedAt, locale)}
                </span>
              ) : null}
            </div>

            <div className={styles.profileMetaLine}>
              {age !== null ? `${age} ${t.childDetail.years}` : '—'} • {t.childDetail.born}{' '}
              {fmtDate(child.birthDate, locale)} {child?.school?.className ? `• ${child.school.className}` : ''}
            </div>

            <div className={styles.profileBtnRow}>
              <Link className={styles.primaryBtn} href={`/child-info/${id}/edit`}>
                <Pencil size={16} /> {t.childDetail.edit}
              </Link>
              <Link className={styles.secondaryBtn} href={`/calendar?child=${id}`}>
                <Calendar size={16} /> {t.childDetail.calendar}
              </Link>
            </div>

            <div className={styles.confirmWrap}>
              <ConfirmChildButton
                childId={child.id}
                status={child.status}
                createdBy={child.createdBy}
              />
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <UserRound size={18} />
                <div className={styles.cardTitle}>{t.childDetail.primaryContact}</div>
              </div>
              {primary?.isPrimary ? <span className={styles.badgePrimary}>{t.childDetail.primary}</span> : null}
            </div>

            {primary ? (
              <div className={styles.contactBox}>
                <div className={styles.contactName}>{primary.name || '—'}</div>
                <div className={styles.contactSub}>{primary.relation || '—'}</div>

                <div className={styles.contactPhone}>
                  <Phone size={16} />
                  <span>{renderPhones(primary.phones)}</span>
                </div>

                {primary?.note ? <div className={styles.contactNote}>{primary.note}</div> : null}

                <div className={styles.contactActions}>
                  <button className={styles.smallActionBtn} type="button">
                    <Phone size={16} /> {t.childDetail.call}
                  </button>
                  <button className={styles.smallActionBtn} type="button">
                    <FileText size={16} /> {t.childDetail.sms}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.empty}>{t.childDetail.noEmergencyContacts}</div>
            )}
          </section>
        </aside>

        <main className={styles.rightCol}>
          <section className={`${styles.card} ${styles.alertCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <AlertTriangle size={18} />
                <div className={styles.cardTitle}>{t.childDetail.medicalAlerts}</div>
              </div>
            </div>

            <div className={styles.alertGrid}>
              <div className={styles.alertItem}>
                <div className={styles.alertK}>{t.childDetail.bloodType}</div>
                <div className={styles.alertV}>
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown'
                    ? child.medical.bloodType
                    : '—'}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>{t.childDetail.allergies}</div>
                <div className={styles.alertV}>
                  {allergies.length ? allergies.join(', ') : t.childDetail.noneReported}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>{t.childDetail.conditions}</div>
                <div className={styles.alertV}>
                  {conditions.length ? conditions.join(', ') : t.childDetail.noneReported}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>{t.childDetail.emergencyInstruction}</div>
                <div className={styles.alertV}>
                  {child.medical?.emergencyInstruction || child.medical?.notesShort || '—'}
                </div>
              </div>
            </div>
          </section>

          <div className={styles.twoColRow}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <UserRound size={18} />
                  <div className={styles.cardTitle}>{t.childDetail.basicInfo}</div>
                </div>
                <Link className={styles.cardLink} href={`/child-info/${id}/edit`}>
                  {t.childDetail.edit}
                </Link>
              </div>

              <div className={styles.kvTable}>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.fullName}</div>
                  <div className={styles.kvV}>{child.fullName || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.dateOfBirth}</div>
                  <div className={styles.kvV}>{fmtDate(child.birthDate, locale)}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.gender}</div>
                  <div className={styles.kvV}>{child.gender || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.nationalId}</div>
                  <div className={styles.kvVMono}>{child.nationalId || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.status}</div>
                  <div className={styles.kvV}>
                    {status === 'confirmed' ? t.childDetail.confirmed : t.childDetail.pending}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <School size={18} />
                  <div className={styles.cardTitle}>{t.childDetail.schoolDetails}</div>
                </div>
                <Link className={styles.cardLink} href={`/child-info/${id}/edit`}>
                  {t.childDetail.edit}
                </Link>
              </div>

              <div className={styles.kvTable}>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.school}</div>
                  <div className={styles.kvV}>{child.school?.schoolName || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.className}</div>
                  <div className={styles.kvV}>{child.school?.className || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.homeroom}</div>
                  <div className={styles.kvV}>{child.school?.mainTeacher || '—'}</div>
                </div>
              </div>
            </section>
          </div>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <HeartPulse size={18} />
                <div className={styles.cardTitle}>{t.childDetail.medicalDetails}</div>
              </div>
            </div>

            <div className={styles.kvTable}>
              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.bloodType}</div>
                <div className={styles.kvV}>
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown'
                    ? child.medical.bloodType
                    : '—'}
                </div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.allergies}</div>
                <div className={styles.kvV}>{allergies.length ? allergies.join(', ') : '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.conditions}</div>
                <div className={styles.kvV}>{conditions.length ? conditions.join(', ') : '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.medications}</div>
                <div className={styles.kvV}>{medications.length ? medications.join(', ') : '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.emergencyInstruction}</div>
                <div className={styles.kvV}>{child.medical?.emergencyInstruction || '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.shortNote}</div>
                <div className={styles.kvV}>{child.medical?.notesShort || '—'}</div>
              </div>

              <div className={styles.hr} />
              <div className={styles.subTitle}>{t.childDetail.primaryDoctor}</div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.doctor}</div>
                <div className={styles.kvV}>{child.medical?.gp?.name || '—'}</div>
              </div>
              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.clinic}</div>
                <div className={styles.kvV}>{child.medical?.gp?.clinic || '—'}</div>
              </div>
              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.phones}</div>
                <div className={styles.kvV}>{renderPhones(child.medical?.gp?.phones)}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <Phone size={18} />
                <div className={styles.cardTitle}>{t.childDetail.emergencyContacts}</div>
              </div>
            </div>

            {!emergency.length ? (
              <div className={styles.empty}>{t.childDetail.noEmergencyContacts}</div>
            ) : (
              <div className={styles.emGrid}>
                {emergency.map((c, idx) => (
                  <div
                    key={`${c.name}-${idx}`}
                    className={`${styles.emCard} ${c.isPrimary ? styles.emPrimary : ''}`}
                  >
                    <div className={styles.emTop}>
                      <div className={styles.emName}>{c.name || '—'}</div>
                      {c.isPrimary ? <span className={styles.badgePrimary}>{t.childDetail.primary}</span> : null}
                    </div>
                    <div className={styles.emSub}>{c.relation || '—'}</div>
                    <div className={styles.emPhoneRow}>
                      <Phone size={16} />
                      <span>{renderPhones(c.phones)}</span>
                    </div>
                    {c?.note ? <div className={styles.emNote}>{c.note}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <Calendar size={18} />
                <div className={styles.cardTitle}>{t.childDetail.upcomingEvents}</div>
              </div>
              <Link className={styles.cardLink} href={`/calendar?child=${id}`}>
                {t.childDetail.viewCalendar}
              </Link>
            </div>

            {events.length === 0 ? (
              <div className={styles.empty}>{t.childDetail.noUpcomingEvents}</div>
            ) : (
              <div className={styles.eventList}>
                {events.map((e) => (
                  <div key={String(e.id)} className={styles.eventRow}>
                    <div className={styles.eventDate}>
                      <div className={styles.eventMonth}>{fmtMonth(e.startAt, locale)}</div>
                      <div className={styles.eventDay}>{fmtDay(e.startAt, locale)}</div>
                    </div>

                    <div className={styles.eventBody}>
                      <div className={styles.eventTitle}>{e.title}</div>
                      <div className={styles.eventMeta}>
                        {fmtDateTime(e.startAt, locale)} → {fmtDateTime(e.endAt, locale)}
                      </div>
                      {e.notes ? <div className={styles.eventNotes}>{e.notes}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <FileText size={18} />
                <div className={styles.cardTitle}>{t.childDetail.documents}</div>
              </div>

              <div className={styles.headerLinks}>
                <Link className={styles.cardLink} href={`/child-info/${id}/documents`}>
                  {t.childDetail.viewAll}
                </Link>
                <Link className={styles.cardLink} href={`/child-info/${id}/documents/new`}>
                  {t.childDetail.addNew}
                </Link>
              </div>
            </div>

            <div className={styles.docCats}>
              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=school`}>
                <div className={styles.docCatIcon}>
                  <School size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.academic}</div>
                <div className={styles.docCatSub}>{counts.school} {t.childDetail.files}</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=health`}>
                <div className={styles.docCatIcon}>
                  <HeartPulse size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.medical}</div>
                <div className={styles.docCatSub}>{counts.health} {t.childDetail.files}</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=agreement`}>
                <div className={styles.docCatIcon}>
                  <ShieldCheck size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.consent}</div>
                <div className={styles.docCatSub}>{counts.agreement} {t.childDetail.files}</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=id`}>
                <div className={styles.docCatIcon}>
                  <IdCard size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.id}</div>
                <div className={styles.docCatSub}>{counts.id} {t.childDetail.files}</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=other`}>
                <div className={styles.docCatIcon}>
                  <Shapes size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.other}</div>
                <div className={styles.docCatSub}>{counts.other} {t.childDetail.files}</div>
              </Link>
            </div>

            <div className={styles.docHint}>{t.childDetail.selectCategoryHint}</div>

            {docs.length === 0 ? <div className={styles.empty}>{t.childDetail.noDocumentsYet}</div> : null}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <ClipboardList size={18} />
                <div className={styles.cardTitle}>{t.childDetail.auditLog}</div>
              </div>

              <Link className={styles.cardLink} href={`/child-info/${id}/audit-logs`}>
                {t.childDetail.viewAll}
              </Link>
            </div>

            {audits.length === 0 ? (
              <div className={styles.empty}>{t.childDetail.noHistory}</div>
            ) : (
              <div className={styles.auditList}>
                {audits.map((a) => {
                  const who = actorDisplayName(a, t)
                  const pretty = auditPretty(a, t, locale)
                  const changes =
                    a.action === 'child.confirm'
                      ? []
                      : Array.isArray(a.changes)
                        ? a.changes
                        : []

                  const resetToPending =
                    a.action === 'child.update' && a.meta?.wasResetToPending

                  return (
                    <div
                      key={String(a.id)}
                      className={`${styles.auditRow} ${
                        styles[`auditRow--${actionTone(a.action)}`] || ''
                      }`}
                    >
                      <div className={styles.auditIcon}>
                        <ClipboardList size={16} />
                      </div>

                      <div className={styles.auditBody}>
                        <div className={styles.auditSentence}>
                          <strong>{who}</strong> {pretty.sentence}
                          {pretty.target ? (
                            <>
                              {' '}
                              <strong>{pretty.target}</strong>
                            </>
                          ) : null}
                        </div>

                        <div className={styles.auditMeta}>
                          <span>{fmtDateTime(a.createdAt, locale)}</span>
                          <span className={styles.auditDot}>•</span>
                          <span>{entityLabel(a.entityType, t)}</span>
                          <span className={styles.auditDot}>•</span>
                          <span>{actionLabel(a.action, t)}</span>
                          {pretty.sub ? (
                            <>
                              <span className={styles.auditDot}>•</span>
                              <span>{pretty.sub}</span>
                            </>
                          ) : null}
                        </div>

                        {resetToPending ? (
                          <div className={styles.auditNotice}>
                            {t.childDetail.resetConfirmationNotice}
                          </div>
                        ) : null}

                        {changes.length > 0 ? (
                          <div className={styles.auditChanges}>
                            {changes.map((c, idx) => (
                              <div
                                key={`${a.id}-change-${idx}`}
                                className={styles.auditChangeRow}
                              >
                                <div className={styles.auditChangeField}>
                                  {fieldLabel(c.field, t)}
                                </div>

                                <div className={styles.auditChangeValues}>
                                  <span className={styles.auditChangeFrom}>
                                    {renderChangeValue(c.from, t)}
                                  </span>
                                  <span className={styles.auditChangeArrow}>→</span>
                                  <span className={styles.auditChangeTo}>
                                    {renderChangeValue(c.to, t)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}