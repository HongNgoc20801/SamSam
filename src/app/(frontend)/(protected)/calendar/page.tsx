'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './calendar.module.css'

type Child = { id: string | number; fullName: string; status?: string }
type CalEvent = {
  id: string | number
  title: string
  notes?: string
  startAt: string
  endAt: string
  allDay?: boolean
  child?: string | number | { id: string | number; fullName?: string }
}

// ✅ Payload có thể dùng numeric id (SQL) => select luôn trả string
function normalizeID(v: string) {
  const t = String(v ?? '').trim()
  return /^\d+$/.test(t) ? Number(t) : t
}

function fmt(dt: string) {
  const d = new Date(dt)
  if (Number.isNaN(d.getTime())) return dt
  return new Intl.DateTimeFormat('no-NO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [events, setEvents] = useState<CalEvent[]>([])
  const [error, setError] = useState('')

  // form state
  const [openForm, setOpenForm] = useState(false)
  const [childId, setChildId] = useState('') // select always string
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [saving, setSaving] = useState(false)

  const hasChildren = children.length > 0

  const childNameById = useMemo(() => {
    const m = new Map<string, string>()
    children.forEach((c) => m.set(String(c.id), c.fullName))
    return m
  }, [children])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [cRes, eRes] = await Promise.all([
        fetch('/api/children?limit=100&sort=createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/calendar-events?limit=200&sort=-startAt', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])

      const cRaw = await cRes.text()
      const eRaw = await eRes.text()

      let cData: any = {}
      let eData: any = {}
      try {
        cData = JSON.parse(cRaw)
      } catch {}
      try {
        eData = JSON.parse(eRaw)
      } catch {}

      if (!cRes.ok) {
        const msg = cData?.message || cData?.errors?.[0]?.message || cRaw || `Children failed: ${cRes.status}`
        throw new Error(msg)
      }
      if (!eRes.ok) {
        const msg = eData?.message || eData?.errors?.[0]?.message || eRaw || `Events failed: ${eRes.status}`
        throw new Error(msg)
      }

      setChildren(cData?.docs ?? [])
      setEvents(eData?.docs ?? [])
    } catch (err: any) {
      setError(err?.message || 'Network error')
      setChildren([])
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError('')

    if (!hasChildren) {
      setError('Du må legge til minst ett barn før du kan opprette en avtale.')
      return
    }
    if (!childId) {
      setError('Vennligst velg et barn.')
      return
    }
    if (!title.trim()) {
      setError('Tittel er påkrevd.')
      return
    }
    if (!startAt || !endAt) {
      setError('Vennligst velg start og slutt.')
      return
    }

    const startISO = new Date(startAt).toISOString()
    const endISO = new Date(endAt).toISOString()
    if (new Date(endISO).getTime() <= new Date(startISO).getTime()) {
      setError('Slutt må være etter start.')
      return
    }

    setSaving(true)
    try {
      const childValue = normalizeID(childId) // ✅ FIX Child invalid

      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child: childValue,
          title: title.trim(),
          notes: notes.trim() || undefined,
          startAt: startISO,
          endAt: endISO,
        }),
      })

      // ✅ show đúng error của Payload
      const raw = await res.text()
      let j: any = {}
      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Kunne ikke opprette avtale.'
        throw new Error(msg)
      }

      // reset form
      setTitle('')
      setNotes('')
      setStartAt('')
      setEndAt('')
      setChildId('')
      setOpenForm(false)

      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string | number) {
    if (!confirm('Slette denne avtalen?')) return
    setError('')
    try {
      const res = await fetch(`/api/calendar-events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const raw = await res.text()
      let j: any = {}
      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Kunne ikke slette.'
        throw new Error(msg)
      }

      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    }
  }

  if (loading) return <div className={styles.loading}>Laster…</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Kalender</h1>
          <p className={styles.subtitle}>Legg til avtaler for barna i familiegruppen.</p>
        </div>

        <button
          className={styles.primaryBtn}
          onClick={() => setOpenForm((s) => !s)}
          disabled={!hasChildren}
          title={!hasChildren ? 'Legg til et barn først' : 'Legg til avtale'}
        >
          + Legg til avtale
        </button>
      </div>

      {!hasChildren ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>
            Du har ingen barn registrert enda. Du må legge til minst ett barn før du kan opprette avtaler.
          </p>
          <Link className={styles.linkBtn} href="/child-info/new">
            Legg til barn
          </Link>
        </div>
      ) : null}

      {openForm && hasChildren ? (
        <form className={styles.form} onSubmit={createEvent}>
          <div className={styles.formRow}>
            <label className={styles.label}>
              Velg barn
              <select
                className={styles.select}
                value={childId}
                onChange={(ev) => setChildId(ev.target.value)}
                disabled={saving}
              >
                <option value="">Velg…</option>
                {children.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.fullName} {c.status ? `(${c.status})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Tittel
              <input
                className={styles.input}
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                disabled={saving}
                placeholder="F.eks. Legetime / Barnehage / Fotball"
              />
            </label>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>
              Start
              <input
                className={styles.input}
                type="datetime-local"
                value={startAt}
                onChange={(ev) => setStartAt(ev.target.value)}
                disabled={saving}
              />
            </label>

            <label className={styles.label}>
              Slutt
              <input
                className={styles.input}
                type="datetime-local"
                value={endAt}
                onChange={(ev) => setEndAt(ev.target.value)}
                disabled={saving}
              />
            </label>
          </div>

          <label className={styles.label}>
            Notat (valgfritt)
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              disabled={saving}
              placeholder="F.eks. ta med helsekort, møte opp 10 min før..."
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.secondaryBtn} type="button" onClick={() => setOpenForm(false)} disabled={saving}>
              Avbryt
            </button>
            <button className={styles.primaryBtn} type="submit" disabled={saving}>
              {saving ? 'Lagrer…' : 'Opprett'}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className={styles.error}>Feil: {error}</p> : null}

      {!events.length ? (
        <div className={styles.listEmpty}>Ingen avtaler enda.</div>
      ) : (
        <ul className={styles.list}>
          {events.map((ev) => {
            const cid =
              typeof ev.child === 'object' && ev.child
                ? (ev.child as any).id
                : ev.child

            const childName = cid ? childNameById.get(String(cid)) || 'Barn' : 'Barn'

            return (
              <li key={String(ev.id)} className={styles.item}>
                <div className={styles.itemTop}>
                  <div className={styles.itemTitle}>{ev.title}</div>
                  <button className={styles.dangerBtn} onClick={() => deleteEvent(ev.id)} type="button">
                    Slett
                  </button>
                </div>

                <div className={styles.meta}>
                  <span className={styles.pill}>{childName}</span>
                  <span>
                    {fmt(ev.startAt)} → {fmt(ev.endAt)}
                  </span>
                </div>

                {ev.notes ? <div className={styles.notes}>{ev.notes}</div> : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}