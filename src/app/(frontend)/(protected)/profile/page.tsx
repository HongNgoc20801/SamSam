'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './profile.module.css'

type MediaValue =
  | string
  | {
      id: string
      url?: string
      filename?: string
      alt?: string
    }

type FamilyMember =
  | string
  | {
      id?: string
      firstName?: string
      lastName?: string
      email?: string
      familyRole?: 'father' | 'mother' | 'sibling' | 'other'
      avatar?: MediaValue
    }

type CustomerUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  birthDate?: string
  phone?: string
  address?: string
  gender?: 'male' | 'female' | 'other'
  familyRole?: 'father' | 'mother' | 'sibling' | 'other'
  avatar?: MediaValue
  family?:
    | string
    | {
        id: string
        name?: string
        inviteCode?: string
        members?: FamilyMember[]
      }
}

type CustomerMeResponse = {
  user?: CustomerUser
}

type FamilyDoc = {
  id: string
  name?: string
  inviteCode?: string
  members?: FamilyMember[]
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('no-NO')
}

function labelGender(value?: string) {
  switch (value) {
    case 'male':
      return 'Mann'
    case 'female':
      return 'Kvinne'
    case 'other':
      return 'Annet'
    default:
      return '-'
  }
}

function labelFamilyRole(value?: string) {
  switch (value) {
    case 'father':
      return 'Far'
    case 'mother':
      return 'Mor'
    case 'sibling':
      return 'Barn'
    case 'other':
      return 'Annet'
    default:
      return '-'
  }
}

function getInitials(firstName?: string, lastName?: string, email?: string) {
  const a = firstName?.trim()?.[0] ?? ''
  const b = lastName?.trim()?.[0] ?? ''
  const initials = `${a}${b}`.toUpperCase()
  if (initials) return initials
  return (email?.trim()?.[0] ?? 'U').toUpperCase()
}

function getMediaUrl(media?: MediaValue) {
  if (!media || typeof media === 'string') return ''
  return media.url || ''
}

function isMemberObject(member: FamilyMember): member is Exclude<FamilyMember, string> {
  return typeof member === 'object' && member !== null
}

function memberName(member: FamilyMember) {
  if (!isMemberObject(member)) return 'Member'
  const full = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
  return full || member.email || 'Member'
}

function memberRole(member: FamilyMember) {
  if (!isMemberObject(member)) return '-'
  return labelFamilyRole(member.familyRole)
}

function memberKey(member: FamilyMember, index: number) {
  if (!isMemberObject(member)) return `${member}-${index}`
  return member.id || member.email || String(index)
}

function InfoCard({
  label,
  value,
  full,
}: {
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div className={`${styles.infoItem} ${full ? styles.fullWidth : ''}`}>
      <p className={styles.infoLabel}>{label}</p>
      <p className={styles.infoValue}>{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()

  const API_BASE = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    const clean = base ? base.replace(/\/$/, '') : ''
    return clean ? `${clean}/api` : '/api'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [family, setFamily] = useState<FamilyDoc | null>(null)

  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [joinError, setJoinError] = useState('')
  const [showJoinConfirm, setShowJoinConfirm] = useState(false)

  async function loadProfile() {
    setLoading(true)
    setError('')

    try {
      const meRes = await fetch(`${API_BASE}/customers/me`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!meRes.ok) {
        throw new Error('Kunne ikke hente profilinformasjon.')
      }

      const meData: CustomerMeResponse = await meRes.json()
      const meUser = meData?.user ?? null

      if (!meUser) {
        router.replace('/login')
        return
      }

      setUser(meUser)

      const familyValue = meUser.family
      const familyId = typeof familyValue === 'string' ? familyValue : familyValue?.id

      if (!familyId) {
        setFamily(null)
        return
      }

      const familyRes = await fetch(`${API_BASE}/families/${familyId}?depth=1`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!familyRes.ok) {
        if (typeof familyValue === 'object') {
          setFamily({
            id: familyValue.id,
            name: familyValue.name,
            inviteCode: familyValue.inviteCode,
            members: familyValue.members ?? [],
          })
        } else {
          setFamily(null)
        }
        return
      }

      const familyData = await familyRes.json()
      setFamily(familyData)
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt ved lasting av profil.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  function handleJoinFamily(e: React.FormEvent) {
    e.preventDefault()
    if (joinLoading) return

    setJoinMessage('')
    setJoinError('')

    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinError('Vennligst skriv inn invitasjonskode.')
      return
    }

    setShowJoinConfirm(true)
  }

  async function confirmJoinFamily() {
    if (joinLoading) return

    setJoinMessage('')
    setJoinError('')

    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinError('Vennligst skriv inn invitasjonskode.')
      setShowJoinConfirm(false)
      return
    }

    setJoinLoading(true)

    try {
      const res = await fetch(`${API_BASE}/families/join`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Kunne ikke bli med i familiegruppen.')
      }

      setJoinMessage('Du har blitt koblet til familiegruppen.')
      setJoinCode('')
      setShowJoinConfirm(false)
      await loadProfile()
    } catch (err: any) {
      setJoinError(err?.message || 'Noe gikk galt.')
    } finally {
      setJoinLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/customers/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {}
    router.push('/login')
  }

  async function handleCopyInviteCode() {
    const code = family?.inviteCode?.trim()
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setJoinMessage('Invitasjonskoden er kopiert.')
      setJoinError('')
    } catch {
      setJoinError('Kunne ikke kopiere invitasjonskoden.')
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.wrapper}>
          <section className={styles.card}>
            <p className={styles.loading}>Laster profil…</p>
          </section>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.wrapper}>
          <section className={styles.card}>
            <h1 className={styles.pageHeading}>Profile Settings</h1>
            <p className={styles.error}>{error}</p>
          </section>
        </div>
      </main>
    )
  }

  if (!user) return null

  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Bruker'
  const initials = getInitials(user.firstName, user.lastName, user.email)
  const avatarUrl = getMediaUrl(user.avatar)

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <h1 className={styles.pageHeading}>Profile Settings</h1>
        </div>

        <div className={styles.layout}>
          <div className={styles.leftColumn}>
            <section className={styles.profileHeader}>
              <div className={styles.profileMain}>
                {avatarUrl ? (
                  <img className={styles.avatarImage} src={avatarUrl} alt={fullName} />
                ) : (
                  <div className={styles.avatar}>{initials}</div>
                )}

                <div className={styles.profileText}>
                  <div className={styles.nameRow}>
                    <h2 className={styles.profileName}>{fullName}</h2>
                    <span className={styles.roleBadge}>{labelFamilyRole(user.familyRole)}</span>
                  </div>
                  <p className={styles.profileEmail}>{user.email}</p>
                </div>
              </div>

              <div className={styles.headerActions}>
                <button
                  className={styles.primaryBtn}
                  type="button"
                  onClick={() => router.push('/profile/edit')}
                >
                  Edit Profile
                </button>

                <button
                  className={styles.secondaryBtn}
                  type="button"
                  onClick={() => router.push('/profile/change-password')}
                >
                  Change Password
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Personal Information</h2>

              <div className={styles.infoGrid}>
                <InfoCard label="First Name" value={user.firstName || '-'} />
                <InfoCard label="Last Name" value={user.lastName || '-'} />
                <InfoCard label="Email Address" value={user.email || '-'} />
                <InfoCard label="Phone Number" value={user.phone || '-'} />
                <InfoCard label="Residential Address" value={user.address || '-'} full />
                <InfoCard label="Date of Birth" value={formatDate(user.birthDate)} />
                <InfoCard label="Gender" value={labelGender(user.gender)} />
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>Family Information</h2>

              <div className={styles.infoGrid}>
                <InfoCard label="Family Name" value={family?.name || 'No Family'} />

                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Invitation Code</p>
                  <div className={styles.codeRow}>
                    <p className={styles.infoValue}>{family?.inviteCode || '-'}</p>
                    <button
                      className={styles.copyBtn}
                      type="button"
                      onClick={handleCopyInviteCode}
                      disabled={!family?.inviteCode}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.membersBlock}>
                <h3 className={styles.subTitle}>Family Members</h3>

                {Array.isArray(family?.members) && family.members.length > 0 ? (
                  <div className={styles.memberList}>
                    {family.members.map((member, index) => (
                      <div key={memberKey(member, index)} className={styles.memberItem}>
                        <div className={styles.memberAvatarSmall}>
                          {memberName(member).charAt(0).toUpperCase()}
                        </div>

                        <div className={styles.memberInfo}>
                          <p className={styles.memberName}>{memberName(member)}</p>
                          <p className={styles.memberRole}>{memberRole(member)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.emptyText}>No family members found.</p>
                )}
              </div>

              <div className={styles.noteBox}>
                Å bli med i en annen familiegruppe kan erstatte din nåværende familietilknytning
                og påvirke eksisterende informasjon.
              </div>

              <form className={styles.joinForm} onSubmit={handleJoinFamily}>
                <input
                  className={styles.input}
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter Invitation Code"
                  disabled={joinLoading}
                />

                <button className={styles.joinBtn} type="submit" disabled={joinLoading}>
                  {joinLoading ? 'Joining…' : 'Join Family'}
                </button>
              </form>

              {joinMessage ? <p className={styles.success}>{joinMessage}</p> : null}
              {joinError ? <p className={styles.error}>{joinError}</p> : null}
            </section>
          </div>

          <div className={styles.rightColumn}>
            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>Security</h2>

              <button
                className={styles.sideAction}
                type="button"
                onClick={() => router.push('/profile/change-password')}
              >
                Change Password
              </button>

              <button className={styles.logoutBtn} type="button" onClick={handleLogout}>
                Log Out
              </button>
            </section>

            <section className={styles.sideCard}>
              <h2 className={styles.sectionTitle}>Support</h2>
              <p className={styles.supportText}>
                Samsam supports structured co-parenting with focus on clarity, responsibility,
                and the child’s best interest.
              </p>

              <div className={styles.supportLinks}>
                <button type="button" className={styles.linkBtn}>
                  Help Center
                </button>
                <button type="button" className={styles.linkBtn}>
                  Contact Support
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showJoinConfirm ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Bekreft bytte av familiegruppe</h3>

            <p className={styles.modalText}>
              Hvis du blir med i en annen familiegruppe, kan din nåværende familietilknytning
              bli erstattet, og tilknyttet informasjon kan gå tapt.
            </p>

            <p className={styles.modalWarning}>Er du sikker på at du vil fortsette?</p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setShowJoinConfirm(false)}
                disabled={joinLoading}
              >
                Avbryt
              </button>

              <button
                type="button"
                className={styles.dangerBtn}
                onClick={confirmJoinFamily}
                disabled={joinLoading}
              >
                {joinLoading ? 'Kobler…' : 'Ja, bytt familie'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}