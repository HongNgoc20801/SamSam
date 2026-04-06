'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './childInfo.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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
  const t = useTranslations()

  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [error, setError] = useState('')

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
        setError(e?.message || t.childInfo.networkError)
        setChildren([])
      } finally {
        setLoading(false)
      }
    })()
  }, [t.childInfo.networkError])

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
    return <div className={styles.loading}>{t.childInfo.loading}</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t.childInfo.title}</h1>
          <p className={styles.subtitle}>{t.childInfo.subtitle}</p>
        </div>

        <Link href="/child-info/new" className={styles.primaryBtn}>
          {t.childInfo.addChild}
        </Link>
      </div>

      {error ? (
        <p className={styles.error}>
          {t.childInfo.apiErrorPrefix} {error}
          <br />
          {t.childInfo.apiErrorHint}
        </p>
      ) : null}

      <div className={styles.tools}>
        <div className={styles.searchWrap}>
          <input
            className={styles.search}
            placeholder={t.childInfo.searchPlaceholder}
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
            <option value="all">{t.childInfo.allStatuses}</option>
            <option value="pending">{t.childInfo.pending}</option>
            <option value="confirmed">{t.childInfo.confirmed}</option>
          </select>

          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'az')}
          >
            <option value="newest">{t.childInfo.newest}</option>
            <option value="az">{t.childInfo.az}</option>
          </select>
        </div>
      </div>

      {!hasAny ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyTitle}>{t.childInfo.emptyTitle}</div>
          <div className={styles.emptyText}>{t.childInfo.emptyText}</div>
          <Link href="/child-info/new" className={styles.primaryBtn}>
            {t.childInfo.createChildProfile}
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => {
            const age = calcAge(String(c.birthDate || ''))
            const initial = (String(c.fullName || '').trim()[0] || 'C').toUpperCase()
            const bloodType =
              c?.medical?.bloodType && c.medical.bloodType !== 'unknown'
                ? c.medical.bloodType
                : null
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
                        {emergency ? (
                          <span
                            className={styles.emergencyBadge}
                            title={t.childInfo.emergencyContact}
                          >
                            🚨
                          </span>
                        ) : null}

                        <span className={`${styles.statusPill} ${styles[`status_${status}`]}`}>
                          {status === 'pending'
                            ? t.childInfo.pending
                            : status === 'confirmed'
                              ? t.childInfo.confirmed
                              : t.childInfo.unknown}
                        </span>
                      </div>
                    </div>

                    <div className={styles.subRow}>
                      {age !== null ? (
                        <span>
                          {age} {t.childInfo.yearsSuffix}
                        </span>
                      ) : (
                        <span>—</span>
                      )}

                      {bloodType ? <span className={styles.dot}>•</span> : null}
                      {bloodType ? (
                        <span>
                          {t.childInfo.bloodPrefix}: {bloodType}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.linkHint}>{t.childInfo.openProfile}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}