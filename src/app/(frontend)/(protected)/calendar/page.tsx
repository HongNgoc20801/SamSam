'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './calendar.module.css'

import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  type SlotInfo,
  type Event as RBCBaseEvent,
} from 'react-big-calendar'

import { format, parse, startOfWeek, getDay } from 'date-fns'
import { nb } from 'date-fns/locale'

type Child = { id: string | number; fullName: string; status?: string }

type CalEventDoc = {
  id: string | number
  title: string
  notes?: string
  startAt: string
  endAt: string
  allDay?: boolean
  child?: string | number | { id: string | number; fullName?: string }
}

type RBCResource = {
  notes?: string
  childId?: string
  childName?: string
}

type RBCEvent = RBCBaseEvent & {
  id: string
  title: string
  start: Date
  end: Date
  resource: RBCResource
}

function normalizeID(v: string) {
  const t = String(v ?? '').trim()
  return /^\d+$/.test(t) ? Number(t) : t
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const locales = { 'no-NO': nb }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: nb }),
  getDay,
  locales,
})

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [docs, setDocs] = useState<CalEventDoc[]>([])
  const [error, setError] = useState('')

  const [filterChild, setFilterChild] = useState<'all' | string>('all')

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view'>('create')
  const [activeEvent, setActiveEvent] = useState<RBCEvent | null>(null)

  const [childId, setChildId] = useState('')
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
        fetch('/api/calendar-events?limit=500&sort=-startAt', {
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
        throw new Error(
          cData?.message || cData?.errors?.[0]?.message || cRaw || `Children failed: ${cRes.status}`,
        )
      }
      if (!eRes.ok) {
        throw new Error(
          eData?.message || eData?.errors?.[0]?.message || eRaw || `Events failed: ${eRes.status}`,
        )
      }

      setChildren(cData?.docs ?? [])
      setDocs(eData?.docs ?? [])
    } catch (err: any) {
      setError(err?.message || 'Network error')
      setChildren([])
      setDocs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const events: RBCEvent[] = useMemo(() => {
    const mapped = (docs ?? [])
      .map((d) => {
        const start = new Date(d.startAt)
        const end = new Date(d.endAt)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

        const cid =
          typeof d.child === 'object' && d.child ? (d.child as any).id : d.child
        const cidStr = cid != null ? String(cid) : undefined
        const childName = cidStr ? childNameById.get(cidStr) : undefined

        const ev: RBCEvent = {
          id: String(d.id),
          title: d.title,
          start,
          end,
          allDay: Boolean(d.allDay),
          resource: {
            notes: d.notes,
            childId: cidStr,
            childName,
          },
        }
        return ev
      })
      .filter(Boolean) as RBCEvent[]

    if (filterChild === 'all') return mapped
    return mapped.filter((e) => e.resource.childId === filterChild)
  }, [docs, childNameById, filterChild])

  function resetForm() {
    setChildId('')
    setTitle('')
    setNotes('')
    setStartAt('')
    setEndAt('')
  }

  function openCreateWithRange(start: Date, end: Date) {
    setError('')
    setMode('create')
    setActiveEvent(null)
    setOpen(true)

    setStartAt(toLocalInputValue(start))
    setEndAt(toLocalInputValue(end))

    if (filterChild !== 'all') setChildId(filterChild)
  }

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
      const childValue = normalizeID(childId)

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

      const raw = await res.text()
      let j: any = {}
      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Kunne ikke opprette avtale.'
        throw new Error(msg)
      }

      resetForm()
      setOpen(false)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
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

      setOpen(false)
      setActiveEvent(null)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    }
  }

  if (loading) return <div className={styles.loading}>Laster…</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>Kalender</h1>
          <p className={styles.subtitle}>Velg dato i kalenderen for å legge til avtale.</p>
        </div>

        <div className={styles.topActions}>
          <label className={styles.filterLabel}>
            Filter barn
            <select
              className={styles.select}
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              disabled={!hasChildren}
            >
              <option value="all">Alle</option>
              {children.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </label>

          <button
            className={styles.primaryBtn}
            disabled={!hasChildren}
            title={!hasChildren ? 'Legg til et barn først' : 'Opprett avtale'}
            onClick={() => {
              const now = new Date()
              const end = new Date(now.getTime() + 30 * 60 * 1000)
              openCreateWithRange(now, end)
            }}
          >
            + Ny avtale
          </button>
        </div>
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

      {error ? <p className={styles.error}>Feil: {error}</p> : null}

      <div className={styles.calendarShell}>
        <BigCalendar<RBCEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          selectable
          popup
          style={{ height: '72vh', minHeight: 620 }}  
          onSelectSlot={(slot: SlotInfo) => {
            if (!hasChildren) return
            openCreateWithRange(slot.start as Date, slot.end as Date)
          }}
          onSelectEvent={(ev: RBCEvent) => {
            setMode('view')
            setActiveEvent(ev)
            setOpen(true)
          }}
          tooltipAccessor={(ev: RBCEvent) => (ev.resource.childName ? ev.resource.childName : '')}
          formats={{
            timeGutterFormat: (date: Date, culture: string | undefined, loc: any) =>
              loc.format(date, 'HH:mm', culture),
            eventTimeRangeFormat: (
              { start, end }: { start: Date; end: Date },
              culture: string | undefined,
              loc: any,
            ) => `${loc.format(start, 'HH:mm', culture)}–${loc.format(end, 'HH:mm', culture)}`,
          }}
        />
      </div>

      {open ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setOpen(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{mode === 'create' ? 'Opprett avtale' : 'Avtale'}</div>
              <button className={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            {mode === 'view' && activeEvent ? (
              <div className={styles.viewBox}>
                <div className={styles.viewTitle}>{activeEvent.title}</div>
                <div className={styles.viewMeta}>
                  <span className={styles.pill}>{activeEvent.resource.childName || 'Barn'}</span>
                  <span>
                    {format(activeEvent.start, 'dd.MM.yyyy HH:mm')} → {format(activeEvent.end, 'dd.MM.yyyy HH:mm')}
                  </span>
                </div>

                {activeEvent.resource.notes ? <div className={styles.viewNotes}>{activeEvent.resource.notes}</div> : null}

                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} onClick={() => setOpen(false)}>
                    Lukk
                  </button>
                  <button className={styles.dangerBtn} onClick={() => deleteEvent(activeEvent.id)}>
                    Slett
                  </button>
                </div>
              </div>
            ) : (
              <form className={styles.form} onSubmit={createEvent}>
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
                    placeholder="F.eks. ta med helsekort..."
                  />
                </label>

                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} type="button" onClick={() => setOpen(false)} disabled={saving}>
                    Avbryt
                  </button>
                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? 'Lagrer…' : 'Opprett'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}