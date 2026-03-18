import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './childDetail.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import ConfirmChildButton from './ConfirmChildButton'

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
  meta?: {
    childName?: string
    documentTitle?: string
    documentCategory?: string
    version?: number
    status?: string
    previousStatus?: string
    wasResetToPending?: boolean
    changedFields?: string[]
    [key: string]: any
  }
  actorId?: string
  actorName?: string
  actorType?: 'customer' | 'admin' | 'system'
  summary?: string
  entityType?: 'child' | 'document' | 'event' | 'other'
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

function fmtDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

function fmtDateTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

function normalizeStatus(s?: string) {
  const v = String(s || '').toLowerCase()
  return v.includes('confirm') ? 'confirmed' : 'pending'
}

function renderPhones(phones?: PhoneT[]) {
  const list = (phones || [])
    .map((p) => String(p?.value || '').trim())
    .filter(Boolean)

  if (!list.length) return '—'
  return list.join(' • ')
}

function categoryLabel(c?: ChildDoc['category'] | string) {
  if (c === 'agreement') return 'Consent'
  if (c === 'school') return 'Academic'
  if (c === 'health') return 'Medical'
  if (c === 'id') return 'ID'
  return 'Other'
}

function actorDisplayName(a: AuditLog) {
  if (a?.actorName) return a.actorName
  if (a?.actorType === 'system') return 'System'
  return a?.actorId || 'Unknown user'
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

function actionLabel(action?: string) {
  const a = String(action || '').toLowerCase()
  if (a.includes('confirm')) return 'Confirmed'
  if (a.includes('create')) return 'Created'
  if (a.includes('upload')) return 'Uploaded'
  if (a.includes('replace')) return 'Replaced'
  if (a.includes('delete')) return 'Deleted'
  if (a.includes('update')) return 'Updated'
  return 'Activity'
}

function entityLabel(entityType?: string) {
  if (entityType === 'child') return 'Child'
  if (entityType === 'document') return 'Document'
  if (entityType === 'event') return 'Event'
  return 'Other'
}

function auditPretty(a: AuditLog) {
  const action = String(a.action || '').toLowerCase()
  const meta = a.meta || {}
  const changes = Array.isArray(a.changes) ? a.changes : []

  if (action === 'child.create') {
    return {
      sentence: 'created child profile',
      target: meta?.childName || '',
      sub: '',
      tone: 'create',
    }
  }

  if (action === 'child.confirm') {
    return {
      sentence: 'confirmed child profile',
      target: meta?.childName || '',
      sub: '',
      tone: 'confirm',
    }
  }

  if (action === 'child.update') {
    const resetNotice = meta?.wasResetToPending
      ? 'Confirmation reset because important information changed'
      : `${changes.length} field(s) changed`

    return {
      sentence: 'updated child profile',
      target: meta?.childName || '',
      sub: resetNotice,
      tone: 'update',
    }
  }

  if (action === 'doc.upload') {
    return {
      sentence: 'uploaded document',
      target: meta?.documentTitle || '',
      sub: meta?.documentCategory
        ? `${categoryLabel(meta.documentCategory)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
      tone: 'upload',
    }
  }

  if (action === 'doc.replace') {
    return {
      sentence: 'replaced document',
      target: meta?.documentTitle || '',
      sub: meta?.documentCategory
        ? `${categoryLabel(meta.documentCategory)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
      tone: 'replace',
    }
  }

  if (action === 'doc.update') {
    return {
      sentence: 'updated document',
      target: meta?.documentTitle || '',
      sub:
        changes.length > 0
          ? `${changes.length} field(s) changed`
          : meta?.documentCategory
            ? `${categoryLabel(meta.documentCategory)} • v${meta?.version ?? 1}`
            : `v${meta?.version ?? 1}`,
      tone: 'update',
    }
  }

  if (action === 'doc.delete') {
    return {
      sentence: 'deleted document',
      target: meta?.documentTitle || '',
      sub: meta?.documentCategory
        ? `${categoryLabel(meta.documentCategory)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
      tone: 'delete',
    }
  }

  return {
    sentence: a.summary || a.action || 'did an activity',
    target: '',
    sub: '',
    tone: 'default',
  }
}

function fieldLabel(field?: string) {
  const f = String(field || '').trim()

  const map: Record<string, string> = {
    fullName: 'Full name',
    birthDate: 'Birth date',
    gender: 'Gender',
    nationalId: 'National ID',
    status: 'Status',
    avatar: 'Avatar',

    emergencyContacts: 'Emergency contacts',

    'school.schoolName': 'School name',
    'school.className': 'Class',
    'school.mainTeacher': 'Main teacher',

    'medical.bloodType': 'Blood type',
    'medical.notesShort': 'Medical note',
    'medical.emergencyInstruction': 'Emergency instruction',
    'medical.allergies': 'Allergies',
    'medical.conditions': 'Conditions',
    'medical.medications': 'Medications',
    'medical.gp': 'Doctor info',

    title: 'Title',
    category: 'Category',
    noteShort: 'Short note',
  }

  return map[f] || f || 'Field'
}

function renderChangeValue(v?: string) {
  const value = String(v ?? '').trim()
  if (!value) return '—'

  if (
    value.startsWith('[{') ||
    value.startsWith('{"') ||
    value.startsWith('[') ||
    value.startsWith('{')
  ) {
    if (value.length > 80) return 'Structured data updated'
  }

  if (value.length > 120) return `${value.slice(0, 120)}…`
  return value
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

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const childRes = await serverFetch(`/api/children/${id}?depth=1`)
  if (!childRes.ok) return notFound()

  const child: Child | null = await childRes.json().catch(() => null)
  if (!child?.id) return notFound()

  const nowISO = new Date().toISOString()

  const [docsRes, auditRes, eventsRes] = await Promise.all([
    serverFetch(`/api/${DOCS_SLUG}?limit=200&sort=-createdAt&where[child][equals]=${id}`),
    serverFetch(
      `/api/${AUDIT_SLUG}?limit=${LATEST_AUDIT_LIMIT}&sort=-createdAt&where[child][equals]=${id}`,
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
            <span>Back</span>
          </Link>

          <span className={styles.bcSep}>/</span>
          <span className={styles.bcStrong}>{child.fullName}</span>
        </div>

        <div className={styles.topActions}>
          <Link className={styles.iconBtn} href={`/child-info/${id}/edit`} aria-label="Edit">
            <Pencil size={18} />
          </Link>
          <Link
            className={styles.iconBtn}
            href={`/child-info/${id}/documents/new`}
            aria-label="Upload document"
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
                  alt={child.fullName || 'Child avatar'}
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
                    <ShieldCheck size={14} /> Confirmed
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> Pending
                  </>
                )}
              </span>

              {child.confirmedAt ? (
                <span className={styles.profileMetaDim}>
                  Confirmed at {fmtDateTime(child.confirmedAt)}
                </span>
              ) : null}
            </div>

            <div className={styles.profileMetaLine}>
              {age !== null ? `${age} Years` : '—'} • Born {fmtDate(child.birthDate)}{' '}
              {child?.school?.className ? `• ${child.school.className}` : ''}
            </div>

            <div className={styles.profileBtnRow}>
              <Link className={styles.primaryBtn} href={`/child-info/${id}/edit`}>
                <Pencil size={16} /> Edit
              </Link>
              <Link className={styles.secondaryBtn} href={`/calendar?child=${id}`}>
                <Calendar size={16} /> Calendar
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
                <div className={styles.cardTitle}>Primary Contact</div>
              </div>
              {primary?.isPrimary ? <span className={styles.badgePrimary}>Primary</span> : null}
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
                    <Phone size={16} /> Call
                  </button>
                  <button className={styles.smallActionBtn} type="button">
                    <FileText size={16} /> SMS
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.empty}>No emergency contacts.</div>
            )}
          </section>
        </aside>

        <main className={styles.rightCol}>
          <section className={`${styles.card} ${styles.alertCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <AlertTriangle size={18} />
                <div className={styles.cardTitle}>MEDICAL ALERTS</div>
              </div>
            </div>

            <div className={styles.alertGrid}>
              <div className={styles.alertItem}>
                <div className={styles.alertK}>Blood Type</div>
                <div className={styles.alertV}>
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown'
                    ? child.medical.bloodType
                    : '—'}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>Allergies</div>
                <div className={styles.alertV}>
                  {allergies.length ? allergies.join(', ') : 'None reported'}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>Conditions</div>
                <div className={styles.alertV}>
                  {conditions.length ? conditions.join(', ') : 'None reported'}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>Emergency instruction</div>
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
                  <div className={styles.cardTitle}>Basic Info</div>
                </div>
                <Link className={styles.cardLink} href={`/child-info/${id}/edit`}>
                  Edit
                </Link>
              </div>

              <div className={styles.kvTable}>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>Full Name</div>
                  <div className={styles.kvV}>{child.fullName || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>Date of Birth</div>
                  <div className={styles.kvV}>{fmtDate(child.birthDate)}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>Gender</div>
                  <div className={styles.kvV}>{child.gender || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>National ID</div>
                  <div className={styles.kvVMono}>{child.nationalId || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>Status</div>
                  <div className={styles.kvV}>{status}</div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <School size={18} />
                  <div className={styles.cardTitle}>School Details</div>
                </div>
                <Link className={styles.cardLink} href={`/child-info/${id}/edit`}>
                  Edit
                </Link>
              </div>

              <div className={styles.kvTable}>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>School</div>
                  <div className={styles.kvV}>{child.school?.schoolName || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>Class</div>
                  <div className={styles.kvV}>{child.school?.className || '—'}</div>
                </div>
                <div className={styles.kvRow}>
                  <div className={styles.kvK}>Homeroom</div>
                  <div className={styles.kvV}>{child.school?.mainTeacher || '—'}</div>
                </div>
              </div>
            </section>
          </div>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <HeartPulse size={18} />
                <div className={styles.cardTitle}>Medical Details</div>
              </div>
            </div>

            <div className={styles.kvTable}>
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Blood Type</div>
                <div className={styles.kvV}>
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown'
                    ? child.medical.bloodType
                    : '—'}
                </div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>Allergies</div>
                <div className={styles.kvV}>{allergies.length ? allergies.join(', ') : '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>Conditions</div>
                <div className={styles.kvV}>{conditions.length ? conditions.join(', ') : '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>Medications</div>
                <div className={styles.kvV}>{medications.length ? medications.join(', ') : '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>Emergency instruction</div>
                <div className={styles.kvV}>{child.medical?.emergencyInstruction || '—'}</div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>Short Note</div>
                <div className={styles.kvV}>{child.medical?.notesShort || '—'}</div>
              </div>

              <div className={styles.hr} />
              <div className={styles.subTitle}>Primary Doctor (GP)</div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>Doctor</div>
                <div className={styles.kvV}>{child.medical?.gp?.name || '—'}</div>
              </div>
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Clinic</div>
                <div className={styles.kvV}>{child.medical?.gp?.clinic || '—'}</div>
              </div>
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Phones</div>
                <div className={styles.kvV}>{renderPhones(child.medical?.gp?.phones)}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <Phone size={18} />
                <div className={styles.cardTitle}>Emergency Contacts</div>
              </div>
            </div>

            {!emergency.length ? (
              <div className={styles.empty}>No emergency contacts.</div>
            ) : (
              <div className={styles.emGrid}>
                {emergency.map((c, idx) => (
                  <div
                    key={`${c.name}-${idx}`}
                    className={`${styles.emCard} ${c.isPrimary ? styles.emPrimary : ''}`}
                  >
                    <div className={styles.emTop}>
                      <div className={styles.emName}>{c.name || '—'}</div>
                      {c.isPrimary ? <span className={styles.badgePrimary}>Primary</span> : null}
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
                <div className={styles.cardTitle}>Upcoming Events</div>
              </div>
              <Link className={styles.cardLink} href={`/calendar?child=${id}`}>
                View Calendar
              </Link>
            </div>

            {events.length === 0 ? (
              <div className={styles.empty}>No upcoming events.</div>
            ) : (
              <div className={styles.eventList}>
                {events.map((e) => (
                  <div key={String(e.id)} className={styles.eventRow}>
                    <div className={styles.eventDate}>
                      <div className={styles.eventMonth}>{fmtDate(e.startAt).slice(5, 7)}</div>
                      <div className={styles.eventDay}>{fmtDate(e.startAt).slice(8, 10)}</div>
                    </div>

                    <div className={styles.eventBody}>
                      <div className={styles.eventTitle}>{e.title}</div>
                      <div className={styles.eventMeta}>
                        {fmtDateTime(e.startAt)} → {fmtDateTime(e.endAt)}
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
                <div className={styles.cardTitle}>Documents</div>
              </div>

              <div className={styles.headerLinks}>
                <Link className={styles.cardLink} href={`/child-info/${id}/documents`}>
                  View all
                </Link>
                <Link className={styles.cardLink} href={`/child-info/${id}/documents/new`}>
                  Add New
                </Link>
              </div>
            </div>

            <div className={styles.docCats}>
              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=school`}>
                <div className={styles.docCatIcon}>
                  <School size={18} />
                </div>
                <div className={styles.docCatName}>Academic</div>
                <div className={styles.docCatSub}>{counts.school} files</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=health`}>
                <div className={styles.docCatIcon}>
                  <HeartPulse size={18} />
                </div>
                <div className={styles.docCatName}>Medical</div>
                <div className={styles.docCatSub}>{counts.health} files</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=agreement`}>
                <div className={styles.docCatIcon}>
                  <ShieldCheck size={18} />
                </div>
                <div className={styles.docCatName}>Consent</div>
                <div className={styles.docCatSub}>{counts.agreement} files</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=id`}>
                <div className={styles.docCatIcon}>
                  <IdCard size={18} />
                </div>
                <div className={styles.docCatName}>ID</div>
                <div className={styles.docCatSub}>{counts.id} files</div>
              </Link>

              <Link className={styles.docCatTile} href={`/child-info/${id}/documents?category=other`}>
                <div className={styles.docCatIcon}>
                  <Shapes size={18} />
                </div>
                <div className={styles.docCatName}>Other</div>
                <div className={styles.docCatSub}>{counts.other} files</div>
              </Link>
            </div>

            <div className={styles.docHint}>Select a category to view all files.</div>

            {docs.length === 0 ? <div className={styles.empty}>No documents yet.</div> : null}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <ClipboardList size={18} />
                <div className={styles.cardTitle}>Audit Log</div>
              </div>

              <Link className={styles.cardLink} href={`/child-info/${id}/audit-logs`}>
                View all
              </Link>
            </div>

            {audits.length === 0 ? (
              <div className={styles.empty}>No history.</div>
            ) : (
              <div className={styles.auditList}>
                {audits.map((a) => {
                  const who = actorDisplayName(a)
                  const pretty = auditPretty(a)
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
                          <span>{fmtDateTime(a.createdAt)}</span>
                          <span className={styles.auditDot}>•</span>
                          <span>{entityLabel(a.entityType)}</span>
                          <span className={styles.auditDot}>•</span>
                          <span>{actionLabel(a.action)}</span>
                          {pretty.sub ? (
                            <>
                              <span className={styles.auditDot}>•</span>
                              <span>{pretty.sub}</span>
                            </>
                          ) : null}
                        </div>

                        {resetToPending ? (
                          <div className={styles.auditNotice}>
                            Important profile information changed. Confirmation was reset and
                            requires re-confirmation.
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
                                  {fieldLabel(c.field)}
                                </div>

                                <div className={styles.auditChangeValues}>
                                  <span className={styles.auditChangeFrom}>
                                    {renderChangeValue(c.from)}
                                  </span>
                                  <span className={styles.auditChangeArrow}>→</span>
                                  <span className={styles.auditChangeTo}>
                                    {renderChangeValue(c.to)}
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