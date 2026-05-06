import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './childDetail.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import ConfirmChildButton from './ConfirmChildButton'
import { getTranslations } from '@/app/lib/i18n/getTranslations'
import AuditLogList from '@/app/(frontend)/components/audit/AuditLogList'
import type { AuditLog } from '@/app/(frontend)/components/audit/auditTypes'

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
  CircleCheck,
} from 'lucide-react'

const DOCS_SLUG = 'child_documents'
const AUDIT_SLUG = 'audit_logs'
const LATEST_AUDIT_LIMIT = 5

type ProfileStatus = 'active' | 'inactive' | 'archived'

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
  profileStatus?: ProfileStatus | string
  profileStatusReason?: string
  profileStatusChangedAt?: string
  createdBy?: any
  lastEditedBy?: any
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

function normalizeStatus(s?: string): 'pending' | 'confirmed' {
  const v = String(s || '').toLowerCase()
  return v.includes('confirm') ? 'confirmed' : 'pending'
}

function normalizeProfileStatus(s?: string): ProfileStatus {
  const v = String(s || '').toLowerCase()

  if (v === 'inactive') return 'inactive'
  if (v === 'archived') return 'archived'

  return 'active'
}

function profileLabel(s: ProfileStatus) {
  if (s === 'inactive') return 'Inactive'
  if (s === 'archived') return 'Archived'
  return 'Active'
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
  const profileStatus = normalizeProfileStatus(child.profileStatus)
  const isArchived = profileStatus === 'archived'

  const age = calcAge(child.birthDate)
  const initial = (child.fullName?.trim()?.[0] || 'C').toUpperCase()
  const avatarUrl = getAvatarUrl(child.avatar)

  const allergies = child?.medical?.allergies?.map((x) => x.value).filter(Boolean) ?? []
  const conditions = child?.medical?.conditions?.map((x) => x.value).filter(Boolean) ?? []
  const medications = child?.medical?.medications?.map((x) => x.value).filter(Boolean) ?? []
  const shortNote = child.medical?.notesShort?.trim() || ''

  const hasMedicalAlert =
    allergies.length > 0 ||
    conditions.length > 0 ||
    medications.length > 0 ||
    Boolean(shortNote)

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
          {!isArchived ? (
            <>
              <Link
                className={styles.iconBtn}
                href={`/child-info/${id}/edit`}
                aria-label={t.childDetail.edit}
              >
                <Pencil size={18} />
              </Link>

              <Link
                className={styles.iconBtn}
                href={`/child-info/${id}/documents/new`}
                aria-label={t.childDetail.uploadDocument}
              >
                <Upload size={18} />
              </Link>
            </>
          ) : null}
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
              <div className={styles.statusRow}>
                <span className={`${styles.statusBadge} ${styles[`profile_${profileStatus}`]}`}>
                  <span className={styles.statusDot} />
                  {profileLabel(profileStatus)}
                </span>

                <span
                  className={`${styles.statusBadge} ${
                    status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
                  }`}
                >
                  {status === 'confirmed' ? <CircleCheck size={13} /> : <AlertTriangle size={13} />}
                  {status === 'confirmed' ? t.childDetail.confirmed : t.childDetail.pending}
                </span>
              </div>

              {child.confirmedAt ? (
                <span className={styles.profileMetaDim}>
                  {t.childDetail.confirmedAt} {fmtDateTime(child.confirmedAt, locale)}
                </span>
              ) : null}
            </div>

            {isArchived ? (
              <div className={styles.profileStatusReason}>
                This profile is archived and read-only.
              </div>
            ) : null}

            {profileStatus !== 'active' && child.profileStatusReason ? (
              <div className={styles.profileStatusReason}>{child.profileStatusReason}</div>
            ) : null}

            <div className={styles.profileMetaLine}>
              {age !== null ? `${age} ${t.childDetail.years}` : '—'} • {t.childDetail.born}{' '}
              {fmtDate(child.birthDate, locale)}{' '}
              {child?.school?.className ? `• ${child.school.className}` : ''}
            </div>

            <div className={styles.profileBtnRow}>
              {!isArchived ? (
                <Link className={styles.primaryBtn} href={`/child-info/${id}/edit`}>
                  <Pencil size={16} /> {t.childDetail.edit}
                </Link>
              ) : (
                <span className={styles.disabledBtn}>
                  <Pencil size={16} /> Read-only
                </span>
              )}

              <Link className={styles.secondaryBtn} href={`/calendar?child=${id}`}>
                <Calendar size={16} /> {t.childDetail.calendar}
              </Link>
            </div>

            <div className={styles.confirmWrap}>
              <ConfirmChildButton
                childId={child.id}
                status={child.status}
                lastEditedBy={child.lastEditedBy}
              />
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleRow}>
                <UserRound size={18} />
                <div className={styles.cardTitle}>{t.childDetail.primaryContact}</div>
              </div>

              {primary?.isPrimary ? (
                <span className={styles.badgePrimary}>{t.childDetail.primary}</span>
              ) : null}
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
          <section
            className={`${styles.card} ${
              hasMedicalAlert ? styles.medicalAlertStrong : styles.medicalAlertSoft
            }`}
          >
            <div className={styles.medicalAlertHeader}>
              <div className={styles.medicalAlertIcon}>
                <HeartPulse size={22} />
              </div>

              <div>
                <div className={styles.medicalAlertTitle}>
                  {hasMedicalAlert
                    ? t.childDetail.importantMedicalInfo ?? 'Important medical information'
                    : t.childDetail.medicalAlerts}
                </div>

                <div className={styles.medicalAlertSub}>
                  {hasMedicalAlert
                    ? t.childDetail.medicalAlertHint ?? 'Review before activities or emergencies.'
                    : t.childDetail.noUrgentMedicalAlerts ?? 'No urgent medical alerts reported.'}
                </div>
              </div>
            </div>

            <div className={styles.medicalChipGrid}>
              <div className={styles.medicalChip}>
                <div className={styles.medicalChipLabel}>{t.childDetail.bloodType}</div>
                <div className={styles.medicalChipValue}>
                  {child.medical?.bloodType && child.medical.bloodType !== 'unknown'
                    ? child.medical.bloodType
                    : '—'}
                </div>
              </div>

              <div className={styles.medicalChip}>
                <div className={styles.medicalChipLabel}>{t.childDetail.allergies}</div>
                <div className={styles.medicalChipValue}>
                  {allergies.length ? allergies.join(', ') : t.childDetail.noneReported}
                </div>
              </div>

              <div className={styles.medicalChip}>
                <div className={styles.medicalChipLabel}>{t.childDetail.conditions}</div>
                <div className={styles.medicalChipValue}>
                  {conditions.length ? conditions.join(', ') : t.childDetail.noneReported}
                </div>
              </div>

              <div className={styles.medicalChip}>
                <div className={styles.medicalChipLabel}>{t.childDetail.medications}</div>
                <div className={styles.medicalChipValue}>
                  {medications.length ? medications.join(', ') : '—'}
                </div>
              </div>
            </div>

            {shortNote ? (
              <div className={styles.emergencyInstructionBox}>
                <AlertTriangle size={16} />
                <div>
                  <strong>{t.childDetail.shortNote}</strong>
                  <p>{shortNote}</p>
                </div>
              </div>
            ) : null}
          </section>

          <div className={styles.twoColRow}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <UserRound size={18} />
                  <div className={styles.cardTitle}>{t.childDetail.basicInfo}</div>
                </div>

                {!isArchived ? (
                  <Link className={styles.cardLink} href={`/child-info/${id}/edit`}>
                    {t.childDetail.edit}
                  </Link>
                ) : null}
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

                <div className={styles.kvRow}>
                  <div className={styles.kvK}>{t.childDetail.profileStatus ?? 'Profile status'}</div>
                  <div className={styles.kvV}>{profileLabel(profileStatus)}</div>
                </div>

                {child.profileStatusReason ? (
                  <div className={styles.kvRow}>
                    <div className={styles.kvK}>{t.childDetail.statusReason ?? 'Status reason'}</div>
                    <div className={styles.kvV}>{child.profileStatusReason}</div>
                  </div>
                ) : null}

                {child.profileStatusChangedAt ? (
                  <div className={styles.kvRow}>
                    <div className={styles.kvK}>
                      {t.childDetail.statusChanged ?? 'Status changed'}
                    </div>
                    <div className={styles.kvV}>
                      {fmtDateTime(child.profileStatusChangedAt, locale)}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <School size={18} />
                  <div className={styles.cardTitle}>{t.childDetail.schoolDetails}</div>
                </div>

                {!isArchived ? (
                  <Link className={styles.cardLink} href={`/child-info/${id}/edit`}>
                    {t.childDetail.edit}
                  </Link>
                ) : null}
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
                  <div className={styles.kvK}>{t.childDetail.mainTeacher ?? 'Main Teacher'}</div>
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
                <div className={styles.kvV}>
                  {medications.length ? medications.join(', ') : '—'}
                </div>
              </div>

              <div className={styles.kvRow}>
                <div className={styles.kvK}>{t.childDetail.shortNote}</div>
                <div className={styles.kvV}>{shortNote || '—'}</div>
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

                      {c.isPrimary ? (
                        <span className={styles.badgePrimary}>{t.childDetail.primary}</span>
                      ) : null}
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
              </div>
            </div>

            <div className={styles.docCats}>
              <Link
                className={styles.docCatTile}
                href={`/child-info/${id}/documents?category=school`}
              >
                <div className={styles.docCatIcon}>
                  <School size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.academic}</div>
                <div className={styles.docCatSub}>
                  {counts.school} {t.childDetail.files}
                </div>
              </Link>

              <Link
                className={styles.docCatTile}
                href={`/child-info/${id}/documents?category=health`}
              >
                <div className={styles.docCatIcon}>
                  <HeartPulse size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.medical}</div>
                <div className={styles.docCatSub}>
                  {counts.health} {t.childDetail.files}
                </div>
              </Link>

              <Link
                className={styles.docCatTile}
                href={`/child-info/${id}/documents?category=agreement`}
              >
                <div className={styles.docCatIcon}>
                  <ShieldCheck size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.consent}</div>
                <div className={styles.docCatSub}>
                  {counts.agreement} {t.childDetail.files}
                </div>
              </Link>

              <Link
                className={styles.docCatTile}
                href={`/child-info/${id}/documents?category=id`}
              >
                <div className={styles.docCatIcon}>
                  <IdCard size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.id}</div>
                <div className={styles.docCatSub}>
                  {counts.id} {t.childDetail.files}
                </div>
              </Link>

              <Link
                className={styles.docCatTile}
                href={`/child-info/${id}/documents?category=other`}
              >
                <div className={styles.docCatIcon}>
                  <Shapes size={18} />
                </div>
                <div className={styles.docCatName}>{t.childDetail.other}</div>
                <div className={styles.docCatSub}>
                  {counts.other} {t.childDetail.files}
                </div>
              </Link>
            </div>

            <div className={styles.docHint}>
              {isArchived
                ? 'This child profile is archived. Documents are read-only.'
                : t.childDetail.selectCategoryHint}
            </div>

            {docs.length === 0 ? (
              <div className={styles.empty}>{t.childDetail.noDocumentsYet}</div>
            ) : null}
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

            <AuditLogList
              audits={audits}
              title=""
              subtitle=""
              compact={true}
              allowFilter={false}
              defaultImportantOnly={false}
            />
          </section>
        </main>
      </div>
    </div>
  )
}