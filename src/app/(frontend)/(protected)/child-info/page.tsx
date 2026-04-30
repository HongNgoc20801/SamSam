'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './childInfo.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

type Media = {
  id?: string
  url?: string
  filename?: string
  sizes?: {
    thumbnail?: { url?: string }
    card?: { url?: string }
  }
}

type ProfileStatus = 'active' | 'inactive' | 'archived'
type VerificationStatus = 'pending' | 'confirmed' | 'unknown'
type StatusFilter = 'all' | 'attention' | 'inactive' | 'archived'

type Child = {
  id: string
  fullName?: string
  birthDate?: string
  status?: string
  profileStatus?: ProfileStatus | string
  profileStatusReason?: string
  profileStatusChangedAt?: string
  createdAt?: string
  updatedAt?: string
  updatedBy?: string
  avatar?: string | Media
  medical?: {
    bloodType?: string
  }
  emergencyContact?: {
    phone?: string
  }
  emergencyContacts?: {
    name?: string
    relation?: string
    isPrimary?: boolean
    phone?: string
    phones?: { value?: string }[]
  }[]
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

function normalizeStatus(s?: string): VerificationStatus {
  const v = String(s || '').toLowerCase()

  if (v.includes('pending') || v.includes('venter')) return 'pending'
  if (v.includes('confirm') || v.includes('bekreftet')) return 'confirmed'

  return 'unknown'
}

function normalizeProfileStatus(s?: string): ProfileStatus {
  const v = String(s || '').toLowerCase()

  if (v === 'inactive') return 'inactive'
  if (v === 'archived') return 'archived'

  return 'active'
}

function hasEmergencyContact(c: Child) {
  if (c?.emergencyContact?.phone) return true

  if (Array.isArray(c?.emergencyContacts)) {
    return c.emergencyContacts.some((contact) => {
      const phones = contact?.phones

      if (Array.isArray(phones)) {
        return phones.some((p) => String(p?.value || '').trim())
      }

      return !!String(contact?.phone || '').trim()
    })
  }

  return false
}

function getChildImage(c: Child) {
  const avatar = c?.avatar

  if (!avatar) return ''
  if (typeof avatar === 'string') return ''

  return avatar?.sizes?.thumbnail?.url || avatar?.sizes?.card?.url || avatar?.url || ''
}

function formatDate(value?: string) {
  if (!value) return '—'

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString('no-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getUpdatedBy(c: Child) {
  return String(c?.updatedBy || '').trim() || 'System'
}

function priorityRank(c: Child) {
  const profileStatus = normalizeProfileStatus(c.profileStatus)
  const verificationStatus = normalizeStatus(c.status)

  if (verificationStatus === 'pending' && profileStatus !== 'archived') return 0
  if (!hasEmergencyContact(c) && profileStatus !== 'archived') return 1
  if (profileStatus === 'active') return 2
  if (profileStatus === 'inactive') return 3
  if (profileStatus === 'archived') return 4

  return 5
}

export default function ChildInfoPage() {
  const t = useTranslations()
  const tx = t.childInfo

  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)

        const res = await fetch('/api/children?limit=50&sort=-createdAt&depth=2', {
          credentials: 'include',
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)

        if (!res.ok) {
          setError(data?.message || `Failed: ${res.status}`)
          setChildren([])
          return
        }

        setError('')
        setChildren(data?.docs ?? [])
      } catch (e: any) {
        setError(e?.message || tx.networkError)
        setChildren([])
      } finally {
        setLoading(false)
      }
    })()
  }, [tx.networkError])

  const stats = useMemo(() => {
    const total = children.length
    const archived = children.filter(
      (c) => normalizeProfileStatus(c.profileStatus) === 'archived',
    ).length

    const attention = children.filter((c) => {
      const profileStatus = normalizeProfileStatus(c.profileStatus)
      const status = normalizeStatus(c.status)

      return profileStatus !== 'archived' && (status === 'pending' || !hasEmergencyContact(c))
    }).length

    return { total, attention, archived }
  }, [children])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let list = [...children]

    if (query) {
      list = list.filter((c) => String(c?.fullName || '').toLowerCase().includes(query))
    }

    if (statusFilter === 'attention') {
      list = list.filter((c) => {
        const profileStatus = normalizeProfileStatus(c.profileStatus)
        const status = normalizeStatus(c.status)

        return profileStatus !== 'archived' && (status === 'pending' || !hasEmergencyContact(c))
      })
    }

    if (statusFilter === 'inactive') {
      list = list.filter((c) => normalizeProfileStatus(c.profileStatus) === 'inactive')
    }

    if (statusFilter === 'archived') {
      list = list.filter((c) => normalizeProfileStatus(c.profileStatus) === 'archived')
    }

    list.sort((a, b) => {
      const rankA = priorityRank(a)
      const rankB = priorityRank(b)

      if (rankA !== rankB) return rankA - rankB

      const ta = new Date(a?.updatedAt || a?.createdAt || 0).getTime()
      const tb = new Date(b?.updatedAt || b?.createdAt || 0).getTime()

      return tb - ta
    })

    return list
  }, [children, q, statusFilter])

  if (loading) {
    return <div className={styles.loading}>{tx.loading}</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{tx.title}</h1>
          <p className={styles.subtitle}>{tx.subtitle}</p>
        </div>

        <Link href="/child-info/new" className={styles.primaryBtn}>
          {tx.addChild}
        </Link>
      </div>

      {error ? (
        <p className={styles.error}>
          {tx.apiErrorPrefix} {error}
          <br />
          {tx.apiErrorHint}
        </p>
      ) : null}

      <div className={styles.tools}>
        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            placeholder={tx.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">{tx.filterAll}</option>
          <option value="attention">{tx.filterAttention}</option>
          <option value="inactive">{tx.filterInactive}</option>
          <option value="archived">{tx.filterArchived}</option>
        </select>
      </div>

      <div className={styles.summaryLine}>
        <span>
          {stats.total} {tx.profiles}
        </span>
        <span>
          {stats.attention} {tx.needAttention}
        </span>
        <span>
          {stats.archived} {tx.archivedCount}
        </span>
      </div>

      {!filtered.length ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>+</div>
          <div className={styles.emptyTitle}>{tx.emptyTitle}</div>
          <div className={styles.emptyText}>{tx.emptyText}</div>

          <Link href="/child-info/new" className={styles.secondaryBtn}>
            {tx.createChildProfile}
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => {
            const age = calcAge(c?.birthDate)
            const verificationStatus = normalizeStatus(c?.status)
            const profileStatus = normalizeProfileStatus(c?.profileStatus)
            const image = getChildImage(c)
            const emergencyContactExists = hasEmergencyContact(c)
            const initial = (String(c?.fullName || '').trim()[0] || 'C').toUpperCase()
            const bloodType =
              c?.medical?.bloodType && c.medical.bloodType !== 'unknown'
                ? c.medical.bloodType
                : null

            const needsConfirmation = verificationStatus === 'pending'
            const needsEmergency = !emergencyContactExists
            const isArchived = profileStatus === 'archived'
            const showAttention = (needsConfirmation || needsEmergency) && !isArchived

            return (
              <Link
                key={c.id}
                href={`/child-info/${c.id}`}
                className={`${styles.card} ${
                  profileStatus === 'inactive'
                    ? styles.cardInactive
                    : profileStatus === 'archived'
                      ? styles.cardArchived
                      : ''
                } ${showAttention ? styles.cardAttention : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.childIdentity}>
                    <div className={styles.avatar}>
                      {image ? (
                        <img
                          src={image}
                          alt={c?.fullName || tx.title}
                          className={styles.avatarImg}
                        />
                      ) : (
                        <span className={styles.avatarFallback}>{initial}</span>
                      )}
                    </div>

                    <div className={styles.childText}>
                      <h2 className={styles.name}>{c?.fullName || '—'}</h2>

                      <div className={styles.dataRow}>
                        {age !== null ? (
                          <span>
                            {age} {tx.yearsSuffix}
                          </span>
                        ) : (
                          <span>—</span>
                        )}

                        {bloodType ? (
                          <>
                            <span className={styles.dot}>•</span>
                            <span>
                              {tx.bloodPrefix}: {bloodType}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {profileStatus !== 'active' ? (
                    <span className={`${styles.statusPill} ${styles[`profile_${profileStatus}`]}`}>
                      {profileStatus === 'inactive' ? tx.profileInactive : tx.profileArchived}
                    </span>
                  ) : null}
                </div>

                {showAttention ? (
                  <div className={styles.actionBlock}>
                    <div className={styles.actionHeader}>
                      <span className={styles.actionIcon}>!</span>
                      <span className={styles.actionTitle}>
                        {needsConfirmation ? tx.needsConfirmation : tx.missingEmergency}
                      </span>
                    </div>
                  </div>
                ) : null}

                {profileStatus !== 'active' && c.profileStatusReason ? (
                  <div className={styles.inactiveReason}>
                    {tx.reason}: {c.profileStatusReason}
                  </div>
                ) : null}

                <div className={styles.auditRow}>
                  <span>
                    {tx.updated}: {formatDate(c?.updatedAt || c?.createdAt)}
                  </span>
                  <span>
                    {tx.by}: {getUpdatedBy(c)}
                  </span>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.linkHint}>
                    {isArchived ? tx.readOnlyProfile : tx.openProfile}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}