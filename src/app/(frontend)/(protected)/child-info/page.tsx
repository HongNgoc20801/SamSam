'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './childInfo.module.css'

type Status = 'pending' | 'confirmed' | 'unknown'

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

type Phone = {
  value?: string
}

type EmergencyContact = {
  name?: string
  relation?: string
  isPrimary?: boolean
  phones?: Phone[]
  phone?: string
}

type Medical = {
  bloodType?: string
}

type Child = {
  id: string
  fullName?: string
  birthDate?: string
  createdAt?: string
  status?: string
  avatar?: Media | string | null
  medical?: Medical
  emergencyContact?: {
    phone?: string
  }
  emergencyContacts?: EmergencyContact[]
}

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null

  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()

  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age--
  }

  return age
}

function normalizeStatus(value: unknown): Status {
  const v = String(value || '').toLowerCase()

  if (v.includes('pending')) return 'pending'
  if (v.includes('confirm')) return 'confirmed'

  return 'unknown'
}

function hasEmergency(child: Child): boolean {
  if (child?.emergencyContact?.phone) return true

  if (Array.isArray(child?.emergencyContacts)) {
    return child.emergencyContacts.some((contact) => {
      if (contact?.phone) return true
      if (!Array.isArray(contact?.phones)) return false

      return contact.phones.some((p) => String(p?.value || '').trim())
    })
  }

  return false
}

function normalizeMediaUrl(url: string): string {
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

function Avatar({
  child,
  initial,
}: {
  child: Child
  initial: string
}) {
  const [imgFailed, setImgFailed] = useState(false)

  const avatarUrl = getAvatarUrl(child?.avatar)
  const canShowImage = !!avatarUrl && !imgFailed

  return (
    <div className={styles.avatar}>
      {canShowImage ? (
        <img
          className={styles.avatarImg}
          src={avatarUrl}
          alt={child.fullName || 'Child avatar'}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={styles.avatarFallback}>{initial}</span>
      )}
    </div>
  )
}

export default function ChildInfoPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'az'>('newest')

  useEffect(() => {
    let ignore = false

    ;(async () => {
      try {
        setLoading(true)

        const res = await fetch('/api/children?limit=50&sort=-createdAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)

        if (!res.ok) {
          if (!ignore) {
            setError(data?.message || `Failed: ${res.status}`)
            setChildren([])
          }
          return
        }

        if (!ignore) {
          setError('')
          setChildren(Array.isArray(data?.docs) ? data.docs : [])
        }
      } catch (e: any) {
        if (!ignore) {
          setError(e?.message || 'Network error')
          setChildren([])
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    })()

    return () => {
      ignore = true
    }
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let list = [...children]

    if (query) {
      list = list.filter((child) =>
        String(child?.fullName || '')
          .toLowerCase()
          .includes(query),
      )
    }

    if (statusFilter !== 'all') {
      list = list.filter((child) => normalizeStatus(child?.status) === statusFilter)
    }

    if (sortBy === 'az') {
      list.sort((a, b) =>
        String(a?.fullName || '').localeCompare(String(b?.fullName || '')),
      )
    } else {
      list.sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime()
        const tb = new Date(b?.createdAt || 0).getTime()
        return tb - ta
      })
    }

    return list
  }, [children, q, statusFilter, sortBy])

  const hasAny = filtered.length > 0

  if (loading) {
    return <div className={styles.loading}>Laster…</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Barn-info</h1>
          <p className={styles.subtitle}>
            Administrer profiler, status og nødkontakter.
          </p>
        </div>

        <Link href="/child-info/new" className={styles.primaryBtn}>
          + Legg til barn
        </Link>
      </div>

      {error ? (
        <p className={styles.error}>
          API error: {error}
          <br />
          (Åpne <code>/api/children</code> for å sjekke 404 / 401)
        </p>
      ) : null}

      <div className={styles.tools}>
        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            placeholder="Søk barn (navn)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className={styles.controls}>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'confirmed')}
          >
            <option value="all">Alle status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
          </select>

          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'az')}
          >
            <option value="newest">Nyeste</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      {!hasAny ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyTitle}>Ingen barneprofil funnet</div>
          <div className={styles.emptyText}>
            Opprett en profil for å dele kalender og nødinformasjon med familien.
          </div>
          <Link href="/child-info/new" className={styles.primaryBtn}>
            Opprett barneprofil
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((child) => {
            const age = calcAge(child?.birthDate)
            const initial = (String(child?.fullName || '').trim()[0] || 'C').toUpperCase()
            const bloodType =
              child?.medical?.bloodType && child.medical.bloodType !== 'unknown'
                ? child.medical.bloodType
                : null
            const emergency = hasEmergency(child)
            const status = normalizeStatus(child?.status)

            return (
              <Link key={child.id} href={`/child-info/${child.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <Avatar child={child} initial={initial} />

                  <div className={styles.meta}>
                    <div className={styles.nameRow}>
                      <div className={styles.name}>{child.fullName || '—'}</div>

                      <div className={styles.rightBadges}>
                        {emergency ? (
                          <span className={styles.emergencyBadge} title="Emergency contact">
                            🚨
                          </span>
                        ) : null}

                        <span className={`${styles.statusPill} ${styles[`status_${status}`]}`}>
                          {status === 'pending'
                            ? 'Pending'
                            : status === 'confirmed'
                              ? 'Confirmed'
                              : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.subRow}>
                      {age !== null ? <span>{age} år</span> : <span>—</span>}
                      {bloodType ? <span className={styles.dot}>•</span> : null}
                      {bloodType ? <span>Blod: {bloodType}</span> : null}
                    </div>
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.linkHint}>Åpne profil →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}