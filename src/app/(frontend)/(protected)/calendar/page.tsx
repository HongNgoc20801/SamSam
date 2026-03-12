'use client'

import { Children, cloneElement, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './calendar.module.css'
import { Navigate } from 'react-big-calendar'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  type SlotInfo,
  type Event as RBCBaseEvent,
} from 'react-big-calendar'

import { format, parse, startOfWeek, getDay, addDays, startOfDay } from 'date-fns'
import { nb } from 'date-fns/locale'

type Child = { id: string | number; fullName: string; status?: string }
type EventStatus = 'admin' | 'personal' | 'important' | 'child'

type CalEventDoc = {
  id: string | number
  title: string
  notes?: string
  startAt: string
  endAt: string
  allDay?: boolean
  status?: EventStatus
  child?: string | number | { id: string | number; fullName?: string }
}

type RBCResource = {
  notes?: string
  childId?: string
  childName?: string
  status?: EventStatus
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

function setTime(base: Date, hh: number, mm: number) {
  const d = new Date(base)
  d.setHours(hh, mm, 0, 0)
  return d
}

function isAllDayRange(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime()
  return (
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    diff >= 23 * 60 * 60 * 1000
  )
}

const locales = { 'no-NO': nb }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: nb }),
  getDay,
  locales,
})

const STATUS_COLORS: Record<EventStatus, string> = {
  admin: '#4F7CFF',
  personal: '#2ECC71',
  important: '#FF4D6D',
  child: '#9B6CFF',
}

function getEventColor(s?: EventStatus) {
  return (s && STATUS_COLORS[s]) || '#9CA3AF'
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [docs, setDocs] = useState<CalEventDoc[]>([])
  const [error, setError] = useState('')

  const [filterChild, setFilterChild] = useState<'all' | string>('all')

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [activeEvent, setActiveEvent] = useState<RBCEvent | null>(null)

  const [childId, setChildId] = useState('')
  const [status, setStatus] = useState<EventStatus>('admin')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [saving, setSaving] = useState(false)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<any>(Views.MONTH)

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

        const cid = typeof d.child === 'object' && d.child ? (d.child as any).id : d.child
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
            status: d.status,
          },
        }
        return ev
      })
      .filter(Boolean) as RBCEvent[]

    if (filterChild === 'all') return mapped
    return mapped.filter((e) => e.resource.childId === filterChild)
  }, [docs, childNameById, filterChild])

  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const ev of events) {
      const color = getEventColor(ev.resource.status)
      let cur = startOfDay(ev.start)
      const last = startOfDay(ev.end)
      while (cur.getTime() <= last.getTime()) {
        const key = format(cur, 'yyyy-MM-dd')
        const arr = map.get(key) ?? []
        arr.push(color)
        map.set(key, arr)
        cur = addDays(cur, 1)
      }
    }
    return map
  }, [events])

  function resetForm() {
    setChildId('')
    setStatus('admin')
    setTitle('')
    setNotes('')
    setStartAt('')
    setEndAt('')
  }

  function closeModal() {
    setOpen(false)
    setMode('create')
    setActiveEvent(null)
    resetForm()
    setError('')
  }

  function getInitials(name?: string) {
    const n = (name || '').trim()
    if (!n) return '?'
    const parts = n.split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase()).join('')
  }

  function fillFormFromEvent(ev: RBCEvent) {
    setChildId(ev.resource.childId ?? '')
    setStatus((ev.resource.status ?? 'admin') as EventStatus)
    setTitle(ev.title ?? '')
    setNotes(ev.resource.notes ?? '')
    setStartAt(toLocalInputValue(ev.start))
    setEndAt(toLocalInputValue(ev.end))
  }

  function openCreateWithRange(start: Date, end: Date) {
    setError('')
    setMode('create')
    setActiveEvent(null)
    setOpen(true)

    let s = start
    let e = end

    if (isAllDayRange(start, end)) {
      s = setTime(start, 9, 0)
      e = setTime(start, 9, 30)
    }

    setStartAt(toLocalInputValue(s))
    setEndAt(toLocalInputValue(e))

    if (filterChild !== 'all') setChildId(filterChild)
  }

  function normalizeTimes(startStr: string, endStr: string) {
    const startD = new Date(startStr)
    let endD = new Date(endStr)

    const isMidnightNextDay =
      endD.getHours() === 0 &&
      endD.getMinutes() === 0 &&
      endD.toDateString() !== startD.toDateString()

    if (isMidnightNextDay) {
      endD = new Date(startD)
      endD.setHours(23, 59, 0, 0)
    }

    return { startD, endD }
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError('')

    if (!hasChildren) return setError('Du må legge til minst ett barn før du kan opprette en avtale.')
    if (!childId) return setError('Vennligst velg et barn.')
    if (!title.trim()) return setError('Tittel er påkrevd.')
    if (!startAt || !endAt) return setError('Vennligst velg start og slutt.')

    const { startD, endD } = normalizeTimes(startAt, endAt)
    if (endD.getTime() <= startD.getTime()) return setError('Slutt må være etter start.')

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
          startAt: startD.toISOString(),
          endAt: endD.toISOString(),
          status,
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

  async function updateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!activeEvent) return
    setError('')

    if (!hasChildren) return setError('Du må legge til minst ett barn før du kan opprette en avtale.')
    if (!childId) return setError('Vennligst velg et barn.')
    if (!title.trim()) return setError('Tittel er påkrevd.')
    if (!startAt || !endAt) return setError('Vennligst velg start og slutt.')

    const { startD, endD } = normalizeTimes(startAt, endAt)
    if (endD.getTime() <= startD.getTime()) return setError('Slutt må være etter start.')

    setSaving(true)
    try {
      const childValue = normalizeID(childId)

      const res = await fetch(`/api/calendar-events/${activeEvent.id}`, {
        method: 'PATCH', 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child: childValue,
          title: title.trim(),
          notes: notes.trim() || undefined,
          startAt: startD.toISOString(),
          endAt: endD.toISOString(),
          status,
        }),
      })

      const raw = await res.text()
      let j: any = {}
      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Kunne ikke oppdatere avtale.'
        throw new Error(msg)
      }

      closeModal()
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

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    }
  }

  function Toolbar(props: any) {
    const { label, onNavigate, onView } = props

    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button type="button" className={styles.navBtn} onClick={() => onNavigate('TODAY')}>
            Idag
          </button>

          <div className={styles.navArrows}>
            <button type="button" className={styles.iconNav} onClick={() => onNavigate('PREV')} aria-label="Prev">
              ‹
            </button>
            <button type="button" className={styles.iconNav} onClick={() => onNavigate('NEXT')} aria-label="Next">
              ›
            </button>
          </div>

          <div className={styles.monthLabel}>{label}</div>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.viewSwitch}>
            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.MONTH ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.MONTH)
                onView(Views.MONTH)
              }}
            >
              Måned
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.WEEK ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.WEEK)
                onView(Views.WEEK)
              }}
            >
              Uke
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.DAY ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.DAY)
                onView(Views.DAY)
              }}
            >
              Dag
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.AGENDA ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.AGENDA)
                onView(Views.AGENDA)
              }}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>
    )
  }

  function MonthEvent({ event }: any) {
    const ev = event as RBCEvent
    const color = getEventColor(ev.resource.status)
    return (
      <div className={styles.monthEvent}>
        <span className={styles.monthBar} style={{ backgroundColor: color }} />
        <span className={styles.monthTitle}>{ev.title}</span>
      </div>
    )
  }

  function TimeEvent({ event }: any) {
    const ev = event as RBCEvent
    const time = `${format(ev.start, 'HH:mm')}–${format(ev.end, 'HH:mm')}`

    return (
      <div className={styles.timeEventRow} title={`${ev.title} • ${time}`}>
        <span className={styles.timeEventTitle}>{ev.title}</span>
        <span className={styles.timeEventSep}>•</span>
        <span className={styles.timeEventTimeInline}>{time}</span>
      </div>
    )
  }

  function DayEvent({ event }: any) {
    const ev = event as RBCEvent
    const time = `${format(ev.start, 'HH:mm')}–${format(ev.end, 'HH:mm')}`

    return (
      <div className={styles.dayEvent} title={`${ev.title} • ${time}`}>
        <div className={styles.dayEventTop}>
          <span className={styles.dayEventTitle}>{ev.title}</span>
          <span className={styles.dayEventTime}>{time}</span>
        </div>

        {ev.resource.childName ? <div className={styles.dayEventSub}>{ev.resource.childName}</div> : null}
      </div>
    )
  }

  function DateCellWrapper(props: any) {
    const date: Date = props.value
    const key = format(date, 'yyyy-MM-dd')
    const dots = (dotsByDay.get(key) ?? []).slice(0, 4)

    const onlyChild = Children.only(props.children) as any

    return cloneElement(onlyChild, {
      className: `${onlyChild.props.className || ''} ${styles.dateCell}`,
      children: (
        <>
          {onlyChild.props.children}
          {view === Views.MONTH && dots.length > 0 ? (
            <div className={styles.dotsInCell}>
              {dots.map((c, i) => (
                <span key={i} className={styles.dot} style={{ backgroundColor: c }} />
              ))}
            </div>
          ) : null}
        </>
      ),
    })
  }

  const STATUS_CLASS: Record<EventStatus, string> = {
    admin: styles.evtAdmin,
    personal: styles.evtPersonal,
    important: styles.evtImportant,
    child: styles.evtChild,
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
          culture="no-NO"
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(v) => setView(v)}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          date={currentDate}
          onNavigate={(d) => setCurrentDate(d as Date)}
          selectable
          popup
          showMultiDayTimes={true}
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
          components={{
            toolbar: Toolbar as any,
            dateCellWrapper: DateCellWrapper as any,
            month: { event: MonthEvent as any },
            week: { event: TimeEvent as any },
            day: { event: DayEvent as any },
          }}
          min={new Date(1970, 0, 1, 0, 0)}
          max={new Date(1970, 0, 1, 23, 59)}
          scrollToTime={new Date(1970, 0, 1, 0, 0)}
          step={30}
          timeslots={2}
          eventPropGetter={(ev: RBCEvent) => {
            const s = (ev.resource.status ?? 'admin') as EventStatus
            if (view === Views.MONTH) return { className: styles.evtMonth }
            return { className: `${styles.evt} ${STATUS_CLASS[s]}` }
          }}
        />
      </div>

      {open ? (
        <div className={styles.modalBackdrop} onMouseDown={closeModal}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            {mode === 'view' && activeEvent ? (() => {
              const s = (activeEvent.resource.status ?? 'admin') as EventStatus
              const childName = activeEvent.resource.childName || ''
              const initials = getInitials(childName)

              const startDate = format(activeEvent.start, 'dd.MM.yyyy')
              const endDate = format(activeEvent.end, 'dd.MM.yyyy')
              const dateText = startDate === endDate ? startDate : `${startDate} → ${endDate}`

              const timeText = `${format(activeEvent.start, 'HH:mm')} → ${format(activeEvent.end, 'HH:mm')}`

              return (
                <div className={styles.detailWrap}>
                  <div className={`${styles.detailTopAccent} ${styles[`accent_${s}`]}`} />

                  <div className={styles.detailHeader}>
                    <div className={styles.detailType}>
                      <span className={styles.detailTypeIcon}>🔖</span>
                      <span className={styles.detailTypeText}>HENDELSE</span>
                    </div>

                    <button type="button" className={styles.detailClose} onClick={closeModal} aria-label="Close">
                      ✕
                    </button>
                  </div>

                  <div className={styles.detailTitle}>{activeEvent.title}</div>

                  <div className={styles.badgeRow}>
                    {childName ? (
                      <span className={styles.badgePerson}>
                        <span className={styles.avatar}>{initials}</span>
                        <span className={styles.badgeText}>{childName}</span>
                      </span>
                    ) : null}

                    <span className={`${styles.badgeStatus} ${styles[`status_${s}`]}`}>
                      <span className={styles.badgeStatusIcon}>!</span>
                      <span className={styles.badgeText}>
                        {s === 'important' ? 'QUAN TRỌNG' : s.toUpperCase()}
                      </span>
                    </span>
                  </div>

                  <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                      <div className={styles.infoLabel}>
                        <span className={styles.infoIcon}>📅</span> DATO FOR HENDELSE
                      </div>
                      <div className={styles.infoValue}>{dateText}</div>
                    </div>

                    <div className={styles.infoCard}>
                      <div className={styles.infoLabel}>
                        <span className={styles.infoIcon}>🕒</span> TID
                      </div>
                      <div className={styles.infoValue}>{timeText}</div>
                    </div>
                  </div>

                  <div className={styles.descSection}>
                    <div className={styles.descLabel}>BESKRIVELSE AV HENDELSEN</div>
                    <div className={styles.descBox}>
                      {activeEvent.resource.notes ? activeEvent.resource.notes : (
                        <span className={styles.descMuted}>INGEN BERSKRIVELSE ENNÅ</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailFooter}>
                    <button type="button" className={styles.actionClose} onClick={closeModal}>
                      Lukk
                    </button>

                    <button type="button" className={styles.actionDelete} onClick={() => deleteEvent(activeEvent.id)}>
                      Slett hendelse
                    </button>

                    <button
                      type="button"
                      className={styles.actionEdit}
                      onClick={() => {
                        fillFormFromEvent(activeEvent)
                        setMode('edit')
                      }}
                    >
                      Rediger hendelse
                    </button>
                  </div>
                </div>
              )
            })() : mode === 'edit' ? (
              <form className={styles.form} onSubmit={updateEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>Rediger avtale</div>
                  <button type="button" className={styles.iconBtn} onClick={() => setMode('view')} aria-label="Close">
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  Velg barn
                  <select className={styles.select} value={childId} onChange={(ev) => setChildId(ev.target.value)} disabled={saving}>
                    <option value="">Velg…</option>
                    {children.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.fullName} {c.status ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.label}>
                  Status
                  <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} disabled={saving}>
                    <option value="admin">Admin (blå)</option>
                    <option value="personal">Personlig (grønn)</option>
                    <option value="important">Viktig (rosa/rød)</option>
                    <option value="child">Barn (lilla)</option>
                  </select>
                </label>

                <label className={styles.label}>
                  Tittel
                  <input className={styles.input} value={title} onChange={(ev) => setTitle(ev.target.value)} disabled={saving} />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Start
                    <input className={styles.input} type="datetime-local" value={startAt} onChange={(ev) => setStartAt(ev.target.value)} disabled={saving} />
                  </label>

                  <label className={styles.label}>
                    Slutt
                    <input className={styles.input} type="datetime-local" value={endAt} onChange={(ev) => setEndAt(ev.target.value)} disabled={saving} />
                  </label>
                </div>

                <label className={styles.label}>
                  Notat (valgfritt)
                  <textarea className={styles.textarea} value={notes} onChange={(ev) => setNotes(ev.target.value)} disabled={saving} />
                </label>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={() => setMode('view')} disabled={saving}>
                    Avbryt
                  </button>
                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? 'Lagrer…' : 'Lagre endringer'}
                  </button>
                </div>
              </form>
            ) : (
              <form className={styles.form} onSubmit={createEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>Opprett avtale</div>
                  <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Close">
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  Velg barn
                  <select className={styles.select} value={childId} onChange={(ev) => setChildId(ev.target.value)} disabled={saving}>
                    <option value="">Velg…</option>
                    {children.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.fullName} {c.status ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.label}>
                  Status
                  <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as EventStatus)} disabled={saving}>
                    <option value="admin">Admin (blå)</option>
                    <option value="personal">Personlig (grønn)</option>
                    <option value="important">Viktig (rosa/rød)</option>
                    <option value="child">Barn (lilla)</option>
                  </select>
                </label>

                <label className={styles.label}>
                  Tittel
                  <input className={styles.input} value={title} onChange={(ev) => setTitle(ev.target.value)} disabled={saving} placeholder="F.eks. Legetime / Barnehage / Fotball" />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Start
                    <input className={styles.input} type="datetime-local" value={startAt} onChange={(ev) => setStartAt(ev.target.value)} disabled={saving} />
                  </label>

                  <label className={styles.label}>
                    Slutt
                    <input className={styles.input} type="datetime-local" value={endAt} onChange={(ev) => setEndAt(ev.target.value)} disabled={saving} />
                  </label>
                </div>

                <label className={styles.label}>
                  Notat (valgfritt)
                  <textarea className={styles.textarea} value={notes} onChange={(ev) => setNotes(ev.target.value)} disabled={saving} placeholder="F.eks. ta med helsekort..." />
                </label>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={closeModal} disabled={saving}>
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