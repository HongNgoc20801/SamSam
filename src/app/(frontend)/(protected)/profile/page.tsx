'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './profile.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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

  language?: 'no' | 'en'
  notifyCalendarChanges?: boolean
  notifyExpenseUpdates?: boolean
  notifyStatusUpdates?: boolean
  sharePhoneWithFamily?: boolean
  shareAddressWithFamily?: boolean

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

function isMemberObject(member: FamilyMember): member is Exclude<FamilyMember, string> {
  return typeof member === 'object' && member !== null
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

function DetailItem({
  label,
  value,
  wide,
}: {
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div className={`${styles.detailItem} ${wide ? styles.detailItemWide : ''}`}>
      <p className={styles.detailLabel}>{label}</p>
      <p className={styles.detailValue}>{value}</p>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const t = useTranslations()
  const td = t.profile

  const API_BASE = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    const clean = base ? base.replace(/\/$/, '') : ''
    return clean ? `${clean}/api` : '/api'
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [family, setFamily] = useState<FamilyDoc | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [copyError, setCopyError] = useState('')

  function formatDate(value?: string) {
    if (!value) return td.noValue
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    const locale = user?.language === 'en' ? 'en-GB' : 'nb-NO'
    return d.toLocaleDateString(locale)
  }

  function labelGender(value?: string) {
    switch (value) {
      case 'male':
        return td.genderMale
      case 'female':
        return td.genderFemale
      case 'other':
        return td.genderOther
      default:
        return td.noValue
    }
  }

  function labelFamilyRole(value?: string) {
    switch (value) {
      case 'father':
        return td.roleFather
      case 'mother':
        return td.roleMother
      case 'sibling':
        return td.roleChild
      case 'other':
        return td.roleOther
      default:
        return td.noValue
    }
  }

  function memberName(member: FamilyMember) {
    if (!isMemberObject(member)) return td.memberFallback
    const full = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
    return full || member.email || td.memberFallback
  }

  function memberRole(member: FamilyMember) {
    if (!isMemberObject(member)) return td.noValue
    return labelFamilyRole(member.familyRole)
  }

  function memberKey(member: FamilyMember, index: number) {
    if (!isMemberObject(member)) return `${member}-${index}`
    return member.id || member.email || String(index)
  }

  async function loadProfile() {
    setLoading(true)
    setError('')
    setCopyMessage('')
    setCopyError('')

    try {
      const meRes = await fetch(`${API_BASE}/customers/me`, {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!meRes.ok) {
        throw new Error(td.loadProfileError)
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
      setError(err?.message || td.loadProfileUnknownError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  async function handleCopyInviteCode() {
    setCopyMessage('')
    setCopyError('')

    const code = family?.inviteCode?.trim()
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopyMessage(td.inviteCodeCopied)
    } catch {
      setCopyError(td.inviteCodeCopyFailed)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.panel}>
            <p className={styles.loading}>{td.loading}</p>
          </section>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.panel}>
            <p className={styles.eyebrow}>{td.pageKicker}</p>
            <h1 className={styles.pageTitle}>{td.pageTitle}</h1>
            <p className={styles.error}>{error}</p>
          </section>
        </div>
      </main>
    )
  }

  if (!user) return null

  const fullName =
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || td.userFallback

  const initials = getInitials(user.firstName, user.lastName, user.email)
  const avatarUrl = getMediaUrl(user.avatar)

  const notificationsEnabled = [
    user.notifyCalendarChanges,
    user.notifyExpenseUpdates,
    user.notifyStatusUpdates,
  ].some(Boolean)

  const privacySummary =
    user.sharePhoneWithFamily || user.shareAddressWithFamily
      ? td.privacyCustom
      : td.privacyLimited

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.headerBlock}>
          <p className={styles.eyebrow}>{td.pageKicker}</p>
          <h1 className={styles.pageTitle}>{td.pageTitle}</h1>
        </div>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.heroSection}>
              <div className={styles.heroMedia}>
                {avatarUrl ? (
                  <img className={styles.avatarImage} src={avatarUrl} alt={fullName} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
              </div>

              <div className={styles.heroContent}>
                <div className={styles.heroTopRow}>
                  <div>
                    <h2 className={styles.userName}>{fullName}</h2>
                    <p className={styles.userEmail}>{user.email}</p>
                  </div>

                  <span className={styles.roleBadge}>{labelFamilyRole(user.familyRole)}</span>
                </div>

                <p className={styles.heroText}>{td.heroText}</p>

                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => router.push('/profile/edit')}
                  >
                    {td.editProfile}
                  </button>

                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => router.push('/settings')}
                  >
                    {td.openSettings}
                  </button>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTop}>
                <h2 className={styles.sectionTitle}>{td.personalInformation}</h2>
                <button
                  className={styles.inlineAction}
                  type="button"
                  onClick={() => router.push('/profile/edit')}
                >
                  {td.updateProfile}
                </button>
              </div>

              <div className={styles.detailGrid}>
                <DetailItem label={td.firstName} value={user.firstName || td.noValue} />
                <DetailItem label={td.lastName} value={user.lastName || td.noValue} />
                <DetailItem label={td.emailAddress} value={user.email || td.noValue} />
                <DetailItem label={td.phoneNumber} value={user.phone || td.noValue} />
                <DetailItem label={td.address} value={user.address || td.noValue} wide />
                <DetailItem label={td.birthDate} value={formatDate(user.birthDate)} />
                <DetailItem label={td.gender} value={labelGender(user.gender)} />
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{td.familyConnection}</h2>

              <div className={styles.familyTop}>
                <div className={styles.familyMeta}>
                  <p className={styles.familyLabel}>{td.familyName}</p>
                  <p className={styles.familyName}>{family?.name || td.noFamily}</p>
                </div>

                <div className={styles.familyMeta}>
                  <p className={styles.familyLabel}>{td.memberCount}</p>
                  <p className={styles.familyName}>
                    {Array.isArray(family?.members) ? family.members.length : 0}
                  </p>
                </div>
              </div>

              <div className={styles.memberGrid}>
                {Array.isArray(family?.members) && family.members.length > 0 ? (
                  family.members.map((member, index) => (
                    <div key={memberKey(member, index)} className={styles.memberCard}>
                      <div className={styles.memberAvatar}>
                        {memberName(member).charAt(0).toUpperCase()}
                      </div>

                      <div className={styles.memberBody}>
                        <p className={styles.memberTitle}>{memberName(member)}</p>
                        <p className={styles.memberSub}>{memberRole(member)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyText}>{td.noFamilyMembersFound}</p>
                )}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanelDark}>
              <p className={styles.sideEyebrowDark}>{td.accountOverview}</p>
              <h3 className={styles.sideTitleDark}>{td.statusTitle}</h3>

              <div className={styles.sideListDark}>
                <div className={styles.sideListItemDark}>
                  <span>{td.language}</span>
                  <strong>{user.language === 'en' ? td.english : td.norwegian}</strong>
                </div>

                <div className={styles.sideListItemDark}>
                  <span>{td.notifications}</span>
                  <strong>{notificationsEnabled ? td.active : td.off}</strong>
                </div>

                <div className={styles.sideListItemDark}>
                  <span>{td.privacy}</span>
                  <strong>{privacySummary}</strong>
                </div>
              </div>

              <button
                className={styles.darkActionButton}
                type="button"
                onClick={() => router.push('/settings')}
              >
                {td.manageSettings}
              </button>
            </section>

            <section className={styles.sidePanel}>
              <p className={styles.sideEyebrow}>{td.inviteCodeTitle}</p>
              <div className={styles.codeBox}>
                <span>{family?.inviteCode || td.noValue}</span>
                <button
                  className={styles.copyIconButton}
                  type="button"
                  onClick={handleCopyInviteCode}
                  disabled={!family?.inviteCode}
                  aria-label={td.copyInviteCode}
                >
                  ⧉
                </button>
              </div>

              <p className={styles.sideText}>{td.inviteCodeHelp}</p>

              {copyMessage ? <p className={styles.success}>{copyMessage}</p> : null}
              {copyError ? <p className={styles.error}>{copyError}</p> : null}
            </section>

            <section className={styles.sidePanel}>
              <p className={styles.sideEyebrow}>{td.quickActions}</p>

              <div className={styles.quickLinks}>
                <button
                  type="button"
                  className={styles.quickLink}
                  onClick={() => router.push('/profile/edit')}
                >
                  {td.editProfile}
                </button>

                <button
                  type="button"
                  className={styles.quickLink}
                  onClick={() => router.push('/settings/change-password')}
                >
                  {td.changePassword}
                </button>

                <button
                  type="button"
                  className={styles.quickLink}
                  onClick={() => router.push('/settings')}
                >
                  {td.goToSettings}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}