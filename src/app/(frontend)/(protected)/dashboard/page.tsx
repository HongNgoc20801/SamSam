'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import styles from './dashboard.module.css'

type DashboardData = {
  upcomingHandover: {
    id: string | number
    title: string
    startAt: string
    endAt: string
    location: string
    childName: string
    handoverFromName: string
    handoverToName: string
    confirmationStatus: string
  } | null
  pendingConfirmations: Array<{
    id: string | number
    title: string
    startAt: string
    childName: string
    confirmationStatus: string
    eventType: string
  }>
  upcomingEvents: Array<{
    id: string | number
    title: string
    startAt: string
    endAt: string
    childName: string
    eventType: string
    location: string
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch('/api/calendar-events?limit=100&sort=startAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error('Failed to load dashboard')
        }

        const json = await res.json()
        const docs = json?.docs ?? []
        const now = new Date()

        const upcoming = docs
          .filter((event: any) => new Date(event.endAt).getTime() >= now.getTime())
          .sort(
            (a: any, b: any) =>
              new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
          )

        const getName = (v: any) => {
          if (!v || typeof v !== 'object') return ''
          return v.fullName || v.name || ''
        }

        const upcomingHandover =
          upcoming.find((event: any) => event.eventType === 'handover') ?? null

        const pendingConfirmations = upcoming.filter(
          (event: any) =>
            event.requiresConfirmation && event.confirmationStatus === 'pending',
        )

        setData({
          upcomingHandover: upcomingHandover
            ? {
                id: upcomingHandover.id,
                title: upcomingHandover.title,
                startAt: upcomingHandover.startAt,
                endAt: upcomingHandover.endAt,
                location: upcomingHandover.location || '',
                childName: getName(upcomingHandover.child),
                handoverFromName: getName(upcomingHandover.handoverFrom),
                handoverToName: getName(upcomingHandover.handoverTo),
                confirmationStatus:
                  upcomingHandover.confirmationStatus || 'not-required',
              }
            : null,
          pendingConfirmations: pendingConfirmations.map((event: any) => ({
            id: event.id,
            title: event.title,
            startAt: event.startAt,
            childName: getName(event.child),
            confirmationStatus: event.confirmationStatus || 'pending',
            eventType: event.eventType || 'other',
          })),
          upcomingEvents: upcoming.slice(0, 5).map((event: any) => ({
            id: event.id,
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            childName: getName(event.child),
            eventType: event.eventType || 'other',
            location: event.location || '',
          })),
        })
      } catch (err: any) {
        setError(err?.message || 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <div className={styles.state}>Loading dashboard...</div>
  if (error) return <div className={styles.stateError}>{error}</div>
  if (!data) return <div className={styles.state}>No data</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Overview of upcoming child coordination</p>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.heroCard}`}>
          <h2 className={styles.cardTitle}>Upcoming handover</h2>

          {data.upcomingHandover ? (
            <div className={styles.heroContent}>
              <div className={styles.heroMain}>
                <div className={styles.heroEvent}>{data.upcomingHandover.title}</div>
                <div className={styles.heroMeta}>
                  {data.upcomingHandover.childName || 'No child selected'}
                </div>
                <div className={styles.heroMeta}>
                  {format(new Date(data.upcomingHandover.startAt), 'dd.MM.yyyy HH:mm')}
                </div>
                <div className={styles.heroMeta}>
                  {data.upcomingHandover.location || 'No location'}
                </div>
              </div>

              <div className={styles.statusPill}>
                {data.upcomingHandover.confirmationStatus}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>No upcoming handover</div>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Pending confirmations</h2>

          {data.pendingConfirmations.length ? (
            <div className={styles.list}>
              {data.pendingConfirmations.map((item) => (
                <div key={String(item.id)} className={styles.listItem}>
                  <div>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemMeta}>
                      {item.childName} · {format(new Date(item.startAt), 'dd.MM HH:mm')}
                    </div>
                  </div>
                  <div className={styles.pendingBadge}>{item.confirmationStatus}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No pending confirmations</div>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Upcoming events</h2>

          {data.upcomingEvents.length ? (
            <div className={styles.list}>
              {data.upcomingEvents.map((item) => (
                <div key={String(item.id)} className={styles.listItem}>
                  <div>
                    <div className={styles.itemTitle}>{item.title}</div>
                    <div className={styles.itemMeta}>
                      {format(new Date(item.startAt), 'dd.MM HH:mm')}
                    </div>
                    <div className={styles.itemMeta}>
                      {item.childName} {item.location ? `· ${item.location}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No upcoming events</div>
          )}
        </section>
      </div>
    </div>
  )
}