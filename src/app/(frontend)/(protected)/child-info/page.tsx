'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './childInfo.module.css'

type Child = any

function calcAge(birthDate: string) {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

function normalizeStatus(s: any): 'pending' | 'confirmed' | 'unknown' {
  const v = String(s || '').toLowerCase()
  if (v.includes('pending')) return 'pending'
  if (v.includes('confirm')) return 'confirmed'
  return 'unknown'
}

function hasEmergency(c: any) {
  // support both old/new shapes
  if (c?.emergencyContact?.phone) return true
  if (Array.isArray(c?.emergencyContacts)) {
    return c.emergencyContacts.some((x: any) => {
      const phones = x?.phones
      if (Array.isArray(phones)) return phones.some((p: any) => String(p?.value || '').trim())
      return !!x?.phone
    })
  }
  return false
}

export default function ChildInfoPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [error, setError] = useState('')

  // UI controls
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'az'>('newest')

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/children?limit=50&sort=-createdAt', {
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
        setError(e?.message || 'Network error')
        setChildren([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    let list = [...(children || [])]

    if (query) {
      list = list.filter((c) => String(c?.fullName || '').toLowerCase().includes(query))
    }

    if (statusFilter !== 'all') {
      list = list.filter((c) => normalizeStatus(c?.status) === statusFilter)
    }

    if (sortBy === 'az') {
      list.sort((a, b) => String(a?.fullName || '').localeCompare(String(b?.fullName || '')))
    } else {
      // newest by createdAt (fallback to nothing)
      list.sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime()
        const tb = new Date(b?.createdAt || 0).getTime()
        return tb - ta
      })
    }

    return list
  }, [children, q, statusFilter, sortBy])

  const hasAny = (filtered?.length ?? 0) > 0

  if (loading) return <div className={styles.loading}>Laster…</div>

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Barn-info</h1>
          <p className={styles.subtitle}>Administrer profiler, status og nødkontakter.</p>
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

      {/* Tools */}
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
          <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">Alle status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
          </select>

          <select className={styles.select} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="newest">Nyeste</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      {/* (OPTIONAL) Upcoming events slot */}
      {/* 
        Mình khuyên hiển thị 3–5 events gần nhất ở đây (1 API call),
        thay vì gắn events riêng trên mỗi card.
      */}
      {/* <UpcomingEvents /> */}

      {!hasAny ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyTitle}>Ingen barneprofil funnet</div>
          <div className={styles.emptyText}>Opprett en profil for å dele kalender og nødinformasjon med familien.</div>
          <Link href="/child-info/new" className={styles.primaryBtn}>
            Opprett barneprofil
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => {
            const age = calcAge(String(c.birthDate || ''))
            const initial = (String(c.fullName || '').trim()[0] || 'C').toUpperCase()
            const bloodType = c?.medical?.bloodType && c.medical.bloodType !== 'unknown' ? c.medical.bloodType : null
            const emergency = hasEmergency(c)
            const status = normalizeStatus(c?.status)

            return (
              <Link key={c.id} href={`/child-info/${c.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.avatar}>{initial}</div>

                  <div className={styles.meta}>
                    <div className={styles.nameRow}>
                      <div className={styles.name}>{c.fullName || '—'}</div>

                      <div className={styles.rightBadges}>
                        {emergency ? <span className={styles.emergencyBadge} title="Emergency contact">🚨</span> : null}
                        <span className={`${styles.statusPill} ${styles[`status_${status}`]}`}>
                          {status === 'pending' ? 'Pending' : status === 'confirmed' ? 'Confirmed' : 'Unknown'}
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