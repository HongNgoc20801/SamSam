'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './childInfo.module.css'

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

export default function ChildInfoPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
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

        setChildren(data?.docs ?? [])
      } catch (e: any) {
        setError(e?.message || 'Network error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const hasAny = useMemo(() => (children?.length ?? 0) > 0, [children])

  if (loading) return <div className={styles.loading}>Laster…</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Barn-info</h1>
        <Link href="/child-info/new" className={styles.addBtn}>
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

      {!hasAny ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>Ingen barneprofil funnet.</p>
          <Link href="/child-info/new" className={styles.addBtn}>
            Opprett barneprofil
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {children.map((c) => {
            const age = calcAge(String(c.birthDate || ''))
            const initial = (String(c.fullName || '').trim()[0] || 'C').toUpperCase()
            const bloodType = c?.medical?.bloodType && c.medical.bloodType !== 'unknown' ? c.medical.bloodType : null

            const hasEmergency =
              !!c?.emergencyContact?.phone ||
              (Array.isArray(c?.emergencyContacts) && c.emergencyContacts.some((x: any) => !!x?.phone))

            return (
              <Link key={c.id} href={`/child-info/${c.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.avatar}>{initial}</div>
                  <div className={styles.meta}>
                    <div className={styles.nameRow}>
                      <div className={styles.name}>{c.fullName}</div>
                      {hasEmergency ? <span className={styles.badge}>🚨</span> : null}
                    </div>

                    <div className={styles.subRow}>
                      {age !== null ? <span>{age} år</span> : <span>—</span>}
                      {bloodType ? <span className={styles.dot}>•</span> : null}
                      {bloodType ? <span>Blod: {bloodType}</span> : null}
                    </div>
                  </div>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.status}>Status: {c.status}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
