import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './childDetail.module.css'
import { serverFetch } from '@/app/lib/serverFetch'
import ConfirmChildButton from './ConfirmChildButton'

type Phone = { value: string }
type EmergencyContact = {
  name: string
  relation?: string
  isPrimary?: boolean
  phones?: Phone[]
}

type Child = {
  id: string
  fullName: string
  birthDate?: string
  gender?: string
  nationalId?: string
  status?: 'pending' | 'confirmed' | string
  avatar?: any

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
      phones?: Phone[]
    }
  }

  emergencyContacts?: EmergencyContact[]

  createdBy?: any
  confirmedAt?: string | null
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

function fmtDate(v?: string) {
  if (!v) return '—'
  return String(v).slice(0, 10) || '—'
}

function statusLabel(s?: string) {
  const v = String(s || '').toLowerCase()
  if (v.includes('confirm')) return { key: 'confirmed', text: 'Confirmed' }
  return { key: 'pending', text: 'Pending' }
}

function relText(r?: string) {
  if (!r) return '—'
  // bạn có thể map sang tiếng Việt nếu muốn
  return r
}

function renderPhones(phones?: Phone[]) {
  const list = (phones || []).map((p) => String(p?.value || '').trim()).filter(Boolean)
  if (!list.length) return '—'
  return list.join(' • ')
}

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const res = await serverFetch(`/api/children/${id}`)
  if (!res.ok) return notFound()

  const child: Child | null = await res.json().catch(() => null)
  if (!child?.id) return notFound()

  const age = calcAge(child.birthDate)
  const st = statusLabel(child.status)

  const allergies = child?.medical?.allergies?.map((x) => x.value).filter(Boolean) || []
  const conditions = child?.medical?.conditions?.map((x) => x.value).filter(Boolean) || []

  const emergency = Array.isArray(child.emergencyContacts) ? child.emergencyContacts : []
  const primaryEmergency = emergency.find((c) => c.isPrimary) || emergency[0]

  const avatarLetter = (child.fullName?.trim()?.[0] || 'C').toUpperCase()

  return (
    <div className={styles.screen}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <Link href="/child-info" className={styles.backBtn} aria-label="Back">
          ←
        </Link>

        <div className={styles.topbarCenter}>
          <div className={styles.topbarTitle}>Child detail</div>
          <div className={styles.topbarSub}>All info from Create Child</div>
        </div>

        <Link href={`/child-info/${child.id}/edit`} className={styles.ghostBtn}>
          Edit
        </Link>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.avatar}>{avatarLetter}</div>

          <div className={styles.heroMeta}>
            <div className={styles.nameRow}>
              <div className={styles.name}>{child.fullName || '—'}</div>
              <span className={`${styles.statusPill} ${st.key === 'confirmed' ? styles.statusConfirmed : styles.statusPending}`}>
                {st.text}
              </span>
            </div>

            <div className={styles.subRow}>
              <span>{age !== null ? `${age} years old` : '—'}</span>
              <span className={styles.dot}>•</span>
              <span>DOB: {fmtDate(child.birthDate)}</span>
              {child?.school?.className ? (
                <>
                  <span className={styles.dot}>•</span>
                  <span>Class: {child.school.className}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Confirm button (giữ logic bạn đang có) */}
        <div className={styles.heroRight}>
          <ConfirmChildButton childId={child.id} status={child.status} createdBy={child.createdBy} />
        </div>
      </section>

      {/* Grid */}
      <div className={styles.grid}>
        {/* Basic */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>Basic information</div>

          <div className={styles.kv}>
            <div className={styles.k}>Full name</div>
            <div className={styles.v}>{child.fullName || '—'}</div>

            <div className={styles.k}>Date of birth</div>
            <div className={styles.v}>{fmtDate(child.birthDate)}</div>

            <div className={styles.k}>Gender</div>
            <div className={styles.v}>{child.gender || '—'}</div>

            <div className={styles.k}>National ID</div>
            <div className={styles.vMono}>{child.nationalId || '—'}</div>
          </div>
        </section>

        {/* School */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>School / Kindergarten</div>

          <div className={styles.kv}>
            <div className={styles.k}>School name</div>
            <div className={styles.v}>{child.school?.schoolName || '—'}</div>

            <div className={styles.k}>Class</div>
            <div className={styles.v}>{child.school?.className || '—'}</div>

            <div className={styles.k}>Main teacher</div>
            <div className={styles.v}>{child.school?.mainTeacher || '—'}</div>
          </div>
        </section>

        {/* Medical */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>Medical (emergency)</div>

          <div className={styles.kv}>
            <div className={styles.k}>Blood type</div>
            <div className={styles.v}>{child.medical?.bloodType && child.medical.bloodType !== 'unknown' ? child.medical.bloodType : '—'}</div>

            <div className={styles.k}>Allergies</div>
            <div className={styles.v}>
              {allergies.length ? (
                <div className={styles.tags}>
                  {allergies.map((t) => (
                    <span key={t} className={styles.tagWarn}>{t}</span>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </div>

            <div className={styles.k}>Conditions</div>
            <div className={styles.v}>
              {conditions.length ? (
                <div className={styles.tags}>
                  {conditions.map((t) => (
                    <span key={t} className={styles.tagNeutral}>{t}</span>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </div>

            <div className={styles.k}>Short note</div>
            <div className={styles.v}>{child.medical?.notesShort || '—'}</div>
          </div>
        </section>

        {/* GP */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>Primary doctor (GP)</div>

          <div className={styles.kv}>
            <div className={styles.k}>Doctor name</div>
            <div className={styles.v}>{child.medical?.gp?.name || '—'}</div>

            <div className={styles.k}>Clinic</div>
            <div className={styles.v}>{child.medical?.gp?.clinic || '—'}</div>

            <div className={styles.k}>Phones</div>
            <div className={styles.v}>{renderPhones(child.medical?.gp?.phones)}</div>
          </div>
        </section>

        {/* Emergency */}
        <section className={styles.cardWide}>
          <div className={styles.cardTitle}>Emergency contacts</div>

          {!emergency.length ? (
            <div className={styles.emptyText}>No emergency contacts.</div>
          ) : (
            <div className={styles.emGrid}>
              {emergency.map((c, idx) => {
                const isPrimary = !!c.isPrimary
                return (
                  <div key={`${c.name}-${idx}`} className={`${styles.emCard} ${isPrimary ? styles.emPrimary : ''}`}>
                    <div className={styles.emTop}>
                      <div className={styles.emName}>{c.name || '—'}</div>
                      {isPrimary ? <span className={styles.primaryBadge}>Primary</span> : null}
                    </div>

                    <div className={styles.emSub}>
                      <span>Relation: {relText(c.relation)}</span>
                    </div>

                    <div className={styles.emPhones}>
                      {renderPhones(c.phones)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {primaryEmergency?.phones?.[0]?.value ? (
            <div className={styles.hintRow}>
              Tip: You can add “Call” / “Copy phone” actions later.
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}