'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './childInfo.module.css'

export default function ChildInfoPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/children?limit=50&sort=createdAt', {
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

  if (loading) {
    return <div className={styles.loading}>Laster…</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Barn-info</h1>
        <Link href="/child-info/new" className={styles.addLink}>
          Legg til barn
        </Link>
      </div>

      {error ? (
        <p className={styles.error}>
          API error: {error}
          <br />
          (Åpne <code>/api/children</code> for å sjekke 404 / 401)
        </p>
      ) : null}

      {!children.length ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>Ingen barneprofil funnet.</p>
          <Link href="/child-info/new" className={styles.addLink}>
            Opprett barneprofil
          </Link>
        </div>
      ) : (
        <ul className={styles.list}>
          {children.map((c) => (
            <li key={c.id} className={styles.listItem}>
              <Link href={`/child-info/${c.id}`} className={styles.childLink}>
                {c.fullName}
              </Link>
              <span className={styles.status}>({c.status})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
