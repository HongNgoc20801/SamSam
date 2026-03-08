import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './childDetail.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import ConfirmChildButton from './ConfirmChildButton'

import {
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

type PhoneT = { value: string }

type EmergencyContact = {
  name: string
  relation?: string
  isPrimary?: boolean
  phones?: PhoneT[]
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

  school?: {
    schoolName?: string
    className?: string
    mainTeacher?: string
  }

  medical?: {
    bloodType?: string
    allergies?: { value: string }[]
    conditions?: { value: string }[]
    notesShort?: string
    gp?: {
      name?: string
      clinic?: string
      phones?: PhoneT[]
    }
  }

  emergencyContacts?: EmergencyContact[]
}

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
  category?: 'agreement' | 'school' | 'health' | 'id' | 'other'
  createdAt?: string
  version?: number
  file?: string | Media
  uploadedBy?: string | { id: string; fullName?: string; email?: string }
}

type AuditLog = {
  id: string
  action: string
  createdAt?: string
  meta?: any
  actorId?: string
  actorName?: string
  actorType?: 'customer' | 'admin' | 'system'
  summary?: string
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
  const list = (phones || []).map((p) => String(p?.value || '').trim()).filter(Boolean)
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

function fileMeta(file?: string | Media) {
  if (!file || typeof file === 'string') return null
  const name = file.filename || 'file'
  const size =
    typeof file.filesize === 'number'
      ? `${Math.max(1, Math.round(file.filesize / 1024))} KB`
      : ''
  return `${name}${size ? ` • ${size}` : ''}`
}

function actorDisplayName(a: AuditLog) {
  if (a?.actorName) return a.actorName
  if (a?.actorType === 'system') return 'System'
  return a?.actorId || 'Unknown user'
}

function auditPretty(a: AuditLog) {
  const action = String(a.action || '').toLowerCase()
  const meta = a.meta || {}

  if (a.summary) {
    return { title: a.summary, sub: '' }
  }

  if (action === 'child.create' || action.includes('child.create')) {
    return {
      title: meta?.fullName ? `Created child profile: ${meta.fullName}` : 'Created child profile',
      sub: '',
    }
  }

  if (action === 'child.confirm' || action.includes('child.confirm')) {
    return {
      title: 'Confirmed child profile',
      sub: meta?.confirmedAt ? `Confirmed at ${fmtDateTime(meta.confirmedAt)}` : '',
    }
  }

  if (action === 'child.update' || action.includes('child.update')) {
    return {
      title: meta?.fullName ? `Updated child profile: ${meta.fullName}` : 'Updated child profile',
      sub:
        Array.isArray(meta?.fields) && meta.fields.length
          ? `Fields: ${meta.fields.join(', ')}`
          : '',
    }
  }

  if (action === 'child.delete' || action.includes('child.delete')) {
    return {
      title: meta?.fullName ? `Deleted child profile: ${meta.fullName}` : 'Deleted child profile',
      sub: '',
    }
  }

  if (action === 'doc.upload' || action.includes('doc.upload')) {
    return {
      title: meta?.title ? `Uploaded document: ${meta.title}` : 'Uploaded document',
      sub: meta?.category ? `Category: ${categoryLabel(meta.category)}` : '',
    }
  }

  if (action === 'doc.replace' || action.includes('doc.replace')) {
    return {
      title: meta?.title ? `Replaced document: ${meta.title}` : 'Replaced document',
      sub: meta?.category
        ? `Category: ${categoryLabel(meta.category)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
    }
  }

  if (action === 'doc.update' || action.includes('doc.update')) {
    return {
      title: meta?.title ? `Updated document: ${meta.title}` : 'Updated document',
      sub:
        Array.isArray(meta?.fields) && meta.fields.length
          ? `Fields: ${meta.fields.join(', ')}`
          : meta?.category
            ? `Category: ${categoryLabel(meta.category)}`
            : '',
    }
  }

  if (action === 'doc.delete' || action.includes('doc.delete')) {
    return {
      title: meta?.title ? `Deleted document: ${meta.title}` : 'Deleted document',
      sub: meta?.category
        ? `Category: ${categoryLabel(meta.category)} • v${meta?.version ?? 1}`
        : `v${meta?.version ?? 1}`,
    }
  }

  return {
    title: a.action || 'Activity',
    sub: '',
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
    'medical.allergies': 'Allergies',
    'medical.conditions': 'Conditions',
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
  if (value.length > 120) return `${value.slice(0, 120)}…`
  return value
}

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const childRes = await serverFetch(`/api/children/${id}`)
  if (!childRes.ok) return notFound()

  const child: Child | null = await childRes.json().catch(() => null)
  if (!child?.id) return notFound()

  const nowISO = new Date().toISOString()

  const [docsRes, auditRes, eventsRes] = await Promise.all([
    serverFetch(`/api/${DOCS_SLUG}?limit=500&sort=-createdAt&where[child][equals]=${id}`),
    serverFetch(`/api/${AUDIT_SLUG}?limit=200&sort=-createdAt&where[child][equals]=${id}`),
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

  const allergies = child?.medical?.allergies?.map((x) => x.value).filter(Boolean) ?? []
  const conditions = child?.medical?.conditions?.map((x) => x.value).filter(Boolean) ?? []

  const emergency = Array.isArray(child.emergencyContacts) ? child.emergencyContacts : []
  const primary = emergency.find((c) => c.isPrimary) || emergency[0]

  const counts = { school: 0, health: 0, agreement: 0, id: 0, other: 0 }
  for (const d of docs) {
    const k = (d.category || 'other') as keyof typeof counts
    counts[k] = (counts[k] || 0) + 1
  }

  const docsByCategory = {
    school: docs.filter((d) => (d.category || 'other') === 'school'),
    health: docs.filter((d) => (d.category || 'other') === 'health'),
    agreement: docs.filter((d) => (d.category || 'other') === 'agreement'),
    id: docs.filter((d) => (d.category || 'other') === 'id'),
    other: docs.filter((d) => (d.category || 'other') === 'other'),
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.breadcrumb}>
          <span className={styles.bcDim}>Dashboard</span>
          <span className={styles.bcSep}>/</span>
          <span className={styles.bcDim}>Students</span>
          <span className={styles.bcSep}>/</span>
          <span className={styles.bcStrong}>{child.fullName}</span>
        </div>

        <div className={styles.topActions}>
          <Link className={styles.iconBtn} href={`/child-info/${id}/edit`} aria-label="Edit">
            <Pencil size={18} />
          </Link>
          <Link className={styles.iconBtn} href={`/child-info/${id}/documents/new`} aria-label="Upload document">
            <Upload size={18} />
          </Link>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.leftCol}>
          <section className={styles.profileCard}>
            <div className={styles.avatarCircle}>{initial}</div>

            <div className={styles.profileName}>{child.fullName}</div>

            <div className={styles.profileStatusRow}>
              <span className={`${styles.statusPill} ${status === 'confirmed' ? styles.statusOk : styles.statusWarn}`}>
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
                <span className={styles.profileMetaDim}>Confirmed at {fmtDateTime(child.confirmedAt)}</span>
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
              <ConfirmChildButton childId={child.id} status={child.status} createdBy={child.createdBy} />
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
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown' ? child.medical.bloodType : '—'}
                </div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>Allergies</div>
                <div className={styles.alertV}>{allergies.length ? allergies.join(', ') : 'None reported'}</div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>Conditions</div>
                <div className={styles.alertV}>{conditions.length ? conditions.join(', ') : 'None reported'}</div>
              </div>

              <div className={styles.alertItem}>
                <div className={styles.alertK}>Note</div>
                <div className={styles.alertV}>{child.medical?.notesShort || '—'}</div>
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
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown' ? child.medical.bloodType : '—'}
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
                  <div key={`${c.name}-${idx}`} className={`${styles.emCard} ${c.isPrimary ? styles.emPrimary : ''}`}>
                    <div className={styles.emTop}>
                      <div className={styles.emName}>{c.name || '—'}</div>
                      {c.isPrimary ? <span className={styles.badgePrimary}>Primary</span> : null}
                    </div>
                    <div className={styles.emSub}>{c.relation || '—'}</div>
                    <div className={styles.emPhoneRow}>
                      <Phone size={16} />
                      <span>{renderPhones(c.phones)}</span>
                    </div>
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
              <Link className={styles.cardLink} href={`/child-info/${id}/documents/new`}>
                Add New
              </Link>
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

            {docs.length === 0 ? (
              <div className={styles.empty}>No documents yet.</div>
            ) : (
              <div className={styles.docGroups}>
                {(['school', 'health', 'agreement', 'id', 'other'] as const).map((key) => {
                  const list = docsByCategory[key]
                  if (!list.length) return null

                  return (
                    <div key={key} className={styles.docGroup}>
                      <div className={styles.docGroupTitle}>
                        {categoryLabel(key)} <span className={styles.docGroupCount}>({list.length})</span>
                      </div>

                      <div className={styles.docList}>
                        {list.map((d) => (
                          <Link key={String(d.id)} href={`/child-info/${id}/documents/${d.id}`} className={styles.docRow}>
                            <div className={styles.docRowIcon}>
                              <FileText size={16} />
                            </div>
                            <div className={styles.docRowBody}>
                              <div className={styles.docRowTitle}>{d.title}</div>
                              <div className={styles.docRowMeta}>
                                {categoryLabel(d.category)} • v{d.version ?? 1} • {fmtDate(d.createdAt)}
                                {fileMeta(d.file) ? ` • ${fileMeta(d.file)}` : ''}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <ClipboardList size={18} />
                <div className={styles.cardTitle}>Audit Log</div>
              </div>
            </div>

            {audits.length === 0 ? (
              <div className={styles.empty}>No history.</div>
            ) : (
              <div className={styles.auditList}>
                {audits.map((a) => {
                  const who = actorDisplayName(a)
                  const pretty = auditPretty(a)
                  const changes = Array.isArray(a.changes) ? a.changes : []

                  return (
                    <div key={String(a.id)} className={styles.auditRow}>
                      <div className={styles.auditIcon}>
                        <ClipboardList size={16} />
                      </div>

                      <div className={styles.auditBody}>
                        <div className={styles.auditAction}>{pretty.title}</div>

                        <div className={styles.auditMeta}>
                          <span>{who}</span>
                          <span className={styles.auditDot}>•</span>
                          <span>{fmtDateTime(a.createdAt)}</span>
                          {pretty.sub ? (
                            <>
                              <span className={styles.auditDot}>•</span>
                              <span>{pretty.sub}</span>
                            </>
                          ) : null}
                        </div>

                        {changes.length > 0 ? (
                          <div className={styles.auditChanges}>
                            {changes.map((c, idx) => (
                              <div key={`${a.id}-change-${idx}`} className={styles.auditChangeRow}>
                                <span className={styles.auditChangeField}>{fieldLabel(c.field)}</span>
                                <span className={styles.auditChangeArrow}>:</span>
                                <span className={styles.auditChangeFrom}>"{renderChangeValue(c.from)}"</span>
                                <span className={styles.auditChangeArrow}>→</span>
                                <span className={styles.auditChangeTo}>"{renderChangeValue(c.to)}"</span>
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