'use client'

import { Children, cloneElement, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './calendar.module.css'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  type SlotInfo,
  type Event as RBCBaseEvent,
} from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addDays, startOfDay } from 'date-fns'
import { nb } from 'date-fns/locale'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

type Child = {
  id: string | number
  fullName: string
  status?: string
}

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

type ModalMode = 'create' | 'view' | 'edit'

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

function getEventColor(status?: EventStatus) {
  return (status && STATUS_COLORS[status]) || '#9CA3AF'
}

function getInitials(name?: string) {
  const n = (name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('')
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

export default function CalendarPage() {
  const t = useTranslations()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [children, setChildren] = useState<Child[]>([])
  const [docs, setDocs] = useState<CalEventDoc[]>([])

  const [filterChild, setFilterChild] = useState<'all' | string>('all')

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ModalMode>('create')
  const [activeEvent, setActiveEvent] = useState<RBCEvent | null>(null)

  const [childId, setChildId] = useState('')
  const [status, setStatus] = useState<EventStatus>('admin')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<any>(Views.MONTH)

  const hasChildren = children.length > 0

  const childNameById = useMemo(() => {
    const map = new Map<string, string>()
    children.forEach((c) => map.set(String(c.id), c.fullName))
    return map
  }, [children])

  const events: RBCEvent[] = useMemo(() => {
    const mapped = (docs ?? [])
      .map((doc) => {
        const start = new Date(doc.startAt)
        const end = new Date(doc.endAt)

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

        const rawChildId =
          typeof doc.child === 'object' && doc.child ? (doc.child as any).id : doc.child

        const childIdStr = rawChildId != null ? String(rawChildId) : undefined
        const childName = childIdStr ? childNameById.get(childIdStr) : undefined

        const event: RBCEvent = {
          id: String(doc.id),
          title: doc.title,
          start,
          end,
          allDay: Boolean(doc.allDay),
          resource: {
            notes: doc.notes,
            childId: childIdStr,
            childName,
            status: doc.status,
          },
        }

        return event
      })
      .filter(Boolean) as RBCEvent[]

    if (filterChild === 'all') return mapped
    return mapped.filter((event) => event.resource.childId === filterChild)
  }, [docs, childNameById, filterChild])

  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const event of events) {
      const color = getEventColor(event.resource.status)
      let current = startOfDay(event.start)
      const last = startOfDay(event.end)

      while (current.getTime() <= last.getTime()) {
        const key = format(current, 'yyyy-MM-dd')
        const list = map.get(key) ?? []
        list.push(color)
        map.set(key, list)
        current = addDays(current, 1)
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
    setError('')
    resetForm()
  }

  function fillFormFromEvent(event: RBCEvent) {
    setChildId(event.resource.childId ?? '')
    setStatus((event.resource.status ?? 'admin') as EventStatus)
    setTitle(event.title ?? '')
    setNotes(event.resource.notes ?? '')
    setStartAt(toLocalInputValue(event.start))
    setEndAt(toLocalInputValue(event.end))
  }

  function openCreateWithRange(start: Date, end: Date) {
    setError('')
    setMode('create')
    setActiveEvent(null)
    setOpen(true)

    let nextStart = start
    let nextEnd = end

    if (isAllDayRange(start, end)) {
      nextStart = setTime(start, 9, 0)
      nextEnd = setTime(start, 9, 30)
    }

    setStartAt(toLocalInputValue(nextStart))
    setEndAt(toLocalInputValue(nextEnd))

    if (filterChild !== 'all') {
      setChildId(filterChild)
    }
  }

  async function parseApiResponse(res: Response) {
    const raw = await res.text()
    let json: any = {}

    try {
      json = JSON.parse(raw)
    } catch {}

    return { raw, json }
  }

  async function loadAll() {
    setLoading(true)
    setError('')

    try {
      const [childrenRes, eventsRes] = await Promise.all([
        fetch('/api/children?limit=100&sort=createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/calendar-events?limit=500&sort=-startAt', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])

      const [{ raw: childrenRaw, json: childrenJson }, { raw: eventsRaw, json: eventsJson }] =
        await Promise.all([parseApiResponse(childrenRes), parseApiResponse(eventsRes)])

      if (!childrenRes.ok) {
        throw new Error(
          childrenJson?.message ||
            childrenJson?.errors?.[0]?.message ||
            childrenRaw ||
            `Children failed (${childrenRes.status})`,
        )
      }

      if (!eventsRes.ok) {
        throw new Error(
          eventsJson?.message ||
            eventsJson?.errors?.[0]?.message ||
            eventsRaw ||
            `Events failed (${eventsRes.status})`,
        )
      }

      setChildren(childrenJson?.docs ?? [])
      setDocs(eventsJson?.docs ?? [])
    } catch (err: any) {
      setError(err?.message || t.calendar.networkError)
      setChildren([])
      setDocs([])
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

    if (!hasChildren) return setError(t.calendar.mustAddChildBeforeCreate)
    if (!childId) return setError(t.calendar.mustSelectChild)
    if (!title.trim()) return setError(t.calendar.titleRequired)
    if (!startAt || !endAt) return setError(t.calendar.startEndRequired)

    const { startD, endD } = normalizeTimes(startAt, endAt)
    if (endD.getTime() <= startD.getTime()) return setError(t.calendar.endAfterStart)

    setSaving(true)

    try {
      const payload = {
        child: normalizeID(childId),
        title: title.trim(),
        notes: notes.trim() || undefined,
        startAt: startD.toISOString(),
        endAt: endD.toISOString(),
        status,
      }

      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const { raw, json } = await parseApiResponse(res)

      if (!res.ok) {
        console.error('POST /api/calendar-events failed', {
          status: res.status,
          payload,
          raw,
          parsed: json,
        })

        throw new Error(
          json?.message ||
            json?.errors?.[0]?.message ||
            raw ||
            `Create failed (${res.status})`,
        )
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || t.calendar.createFailed || t.calendar.genericError)
    } finally {
      setSaving(false)
    }
  }

  async function updateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!activeEvent) return

    setError('')

    if (!hasChildren) return setError(t.calendar.mustAddChildBeforeCreate)
    if (!childId) return setError(t.calendar.mustSelectChild)
    if (!title.trim()) return setError(t.calendar.titleRequired)
    if (!startAt || !endAt) return setError(t.calendar.startEndRequired)

    const { startD, endD } = normalizeTimes(startAt, endAt)
    if (endD.getTime() <= startD.getTime()) return setError(t.calendar.endAfterStart)

    setSaving(true)

    try {
      const payload = {
        child: normalizeID(childId),
        title: title.trim(),
        notes: notes.trim() || undefined,
        startAt: startD.toISOString(),
        endAt: endD.toISOString(),
        status,
      }

      const res = await fetch(`/api/calendar-events/${activeEvent.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const { raw, json } = await parseApiResponse(res)

      if (!res.ok) {
        console.error('PATCH /api/calendar-events failed', {
          status: res.status,
          eventId: activeEvent.id,
          payload,
          raw,
          parsed: json,
        })

        throw new Error(
          json?.message ||
            json?.errors?.[0]?.message ||
            raw ||
            `Update failed (${res.status})`,
        )
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || t.calendar.updateFailed || t.calendar.genericError)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm(t.calendar.deleteConfirm)) return

    setError('')

    try {
      const res = await fetch(`/api/calendar-events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const { raw, json } = await parseApiResponse(res)

      if (!res.ok) {
        console.error('DELETE /api/calendar-events failed', {
          status: res.status,
          eventId: id,
          raw,
          parsed: json,
        })

        throw new Error(
          json?.message ||
            json?.errors?.[0]?.message ||
            raw ||
            `Delete failed (${res.status})`,
        )
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || t.calendar.deleteFailed || t.calendar.genericError)
    }
  }

  function Toolbar(props: any) {
    const { label, onNavigate, onView } = props

    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button type="button" className={styles.navBtn} onClick={() => onNavigate('TODAY')}>
            {t.calendar.today}
          </button>

          <div className={styles.navArrows}>
            <button
              type="button"
              className={styles.iconNav}
              onClick={() => onNavigate('PREV')}
              aria-label={t.calendar.prev}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.iconNav}
              onClick={() => onNavigate('NEXT')}
              aria-label={t.calendar.next}
            >
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
              {t.calendar.month}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.WEEK ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.WEEK)
                onView(Views.WEEK)
              }}
            >
              {t.calendar.week}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.DAY ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.DAY)
                onView(Views.DAY)
              }}
            >
              {t.calendar.day}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.AGENDA ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.AGENDA)
                onView(Views.AGENDA)
              }}
            >
              {t.calendar.agenda}
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

        {ev.resource.childName ? (
          <div className={styles.dayEventSub}>{ev.resource.childName}</div>
        ) : null}
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

  if (loading) {
    return <div className={styles.loading}>{t.calendar.loading}</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>{t.calendar.title}</h1>
          <p className={styles.subtitle}>{t.calendar.subtitle}</p>
        </div>

        <div className={styles.topActions}>
          <label className={styles.filterLabel}>
            {t.calendar.filterChild}
            <select
              className={styles.select}
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              disabled={!hasChildren}
            >
              <option value="all">{t.calendar.allChildren}</option>
              {children.map((child) => (
                <option key={String(child.id)} value={String(child.id)}>
                  {child.fullName}
                </option>
              ))}
            </select>
          </label>

          <button
            className={styles.primaryBtn}
            disabled={!hasChildren}
            title={!hasChildren ? t.calendar.addChildFirstTooltip : t.calendar.createEventTitle}
            onClick={() => {
              const now = new Date()
              const end = new Date(now.getTime() + 30 * 60 * 1000)
              openCreateWithRange(now, end)
            }}
          >
            {t.calendar.newEvent}
          </button>
        </div>
      </div>

      {!hasChildren ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>{t.calendar.noChildrenTitle}</p>
          <Link className={styles.linkBtn} href="/child-info/new">
            {t.calendar.addChild}
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error}>
          {t.calendar.errorPrefix} {error}
        </p>
      ) : null}

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
          onSelectEvent={(event: RBCEvent) => {
            setMode('view')
            setActiveEvent(event)
            setOpen(true)
          }}
          tooltipAccessor={(event: RBCEvent) =>
            event.resource.childName ? event.resource.childName : ''
          }
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
          eventPropGetter={(event: RBCEvent) => {
            const eventStatus = (event.resource.status ?? 'admin') as EventStatus
            if (view === Views.MONTH) return { className: styles.evtMonth }
            return { className: `${styles.evt} ${STATUS_CLASS[eventStatus]}` }
          }}
        />
      </div>

      {open ? (
        <div className={styles.modalBackdrop} onMouseDown={closeModal}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            {mode === 'view' && activeEvent ? (
              (() => {
                const eventStatus = (activeEvent.resource.status ?? 'admin') as EventStatus
                const childName = activeEvent.resource.childName || ''
                const initials = getInitials(childName)

                const startDate = format(activeEvent.start, 'dd.MM.yyyy')
                const endDate = format(activeEvent.end, 'dd.MM.yyyy')
                const dateText = startDate === endDate ? startDate : `${startDate} → ${endDate}`

                const timeText = `${format(activeEvent.start, 'HH:mm')} → ${format(
                  activeEvent.end,
                  'HH:mm',
                )}`

                return (
                  <div className={styles.detailWrap}>
                    <div
                      className={`${styles.detailTopAccent} ${styles[`accent_${eventStatus}`]}`}
                    />

                    <div className={styles.detailHeader}>
                      <div className={styles.detailType}>
                        <span className={styles.detailTypeIcon}>🔖</span>
                        <span className={styles.detailTypeText}>{t.calendar.eventType}</span>
                      </div>

                      <button
                        type="button"
                        className={styles.detailClose}
                        onClick={closeModal}
                        aria-label={t.calendar.close}
                      >
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

                      <span
                        className={`${styles.badgeStatus} ${styles[`status_${eventStatus}`]}`}
                      >
                        <span className={styles.badgeStatusIcon}>!</span>
                        <span className={styles.badgeText}>
                          {eventStatus === 'important'
                            ? t.calendar.importantUpper
                            : eventStatus.toUpperCase()}
                        </span>
                      </span>
                    </div>

                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>📅</span> {t.calendar.eventDate}
                        </div>
                        <div className={styles.infoValue}>{dateText}</div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>🕒</span> {t.calendar.time}
                        </div>
                        <div className={styles.infoValue}>{timeText}</div>
                      </div>
                    </div>

                    <div className={styles.descSection}>
                      <div className={styles.descLabel}>{t.calendar.descriptionTitle}</div>
                      <div className={styles.descBox}>
                        {activeEvent.resource.notes ? (
                          activeEvent.resource.notes
                        ) : (
                          <span className={styles.descMuted}>{t.calendar.noDescriptionYet}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.detailFooter}>
                      <button type="button" className={styles.actionClose} onClick={closeModal}>
                        {t.calendar.close}
                      </button>

                      <button
                        type="button"
                        className={styles.actionDelete}
                        onClick={() => deleteEvent(activeEvent.id)}
                      >
                        {t.calendar.deleteEvent}
                      </button>

                      <button
                        type="button"
                        className={styles.actionEdit}
                        onClick={() => {
                          fillFormFromEvent(activeEvent)
                          setMode('edit')
                        }}
                      >
                        {t.calendar.editEvent}
                      </button>
                    </div>
                  </div>
                )
              })()
            ) : mode === 'edit' ? (
              <form className={styles.form} onSubmit={updateEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>{t.calendar.editAgreement}</div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setMode('view')}
                    aria-label={t.calendar.close}
                  >
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  {t.calendar.selectChild}
                  <select
                    className={styles.select}
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">{t.calendar.selectPlaceholder}</option>
                    {children.map((child) => (
                      <option key={String(child.id)} value={String(child.id)}>
                        {child.fullName}{' '}
                        {child.status ? `(${child.status})` : `(${t.calendar.childStatusUnknown})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.label}>
                  {t.calendar.status}
                  <select
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    disabled={saving}
                  >
                    <option value="admin">{t.calendar.statusAdmin}</option>
                    <option value="personal">{t.calendar.statusPersonal}</option>
                    <option value="important">{t.calendar.statusImportant}</option>
                    <option value="child">{t.calendar.statusChild}</option>
                  </select>
                </label>

                <label className={styles.label}>
                  {t.calendar.titleLabel}
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={saving}
                  />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    {t.calendar.start}
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.label}>
                    {t.calendar.end}
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      disabled={saving}
                    />
                  </label>
                </div>

                <label className={styles.label}>
                  {t.calendar.noteOptional}
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={saving}
                  />
                </label>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setMode('view')}
                    disabled={saving}
                  >
                    {t.calendar.cancel}
                  </button>

                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? t.calendar.saving : t.calendar.saveChanges}
                  </button>
                </div>
              </form>
            ) : (
              <form className={styles.form} onSubmit={createEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>{t.calendar.createAgreement}</div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={closeModal}
                    aria-label={t.calendar.close}
                  >
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  {t.calendar.selectChild}
                  <select
                    className={styles.select}
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">{t.calendar.selectPlaceholder}</option>
                    {children.map((child) => (
                      <option key={String(child.id)} value={String(child.id)}>
                        {child.fullName}{' '}
                        {child.status ? `(${child.status})` : `(${t.calendar.childStatusUnknown})`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.label}>
                  {t.calendar.status}
                  <select
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    disabled={saving}
                  >
                    <option value="admin">{t.calendar.statusAdmin}</option>
                    <option value="personal">{t.calendar.statusPersonal}</option>
                    <option value="important">{t.calendar.statusImportant}</option>
                    <option value="child">{t.calendar.statusChild}</option>
                  </select>
                </label>

                <label className={styles.label}>
                  {t.calendar.titleLabel}
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={saving}
                    placeholder={t.calendar.titlePlaceholder}
                  />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    {t.calendar.start}
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.label}>
                    {t.calendar.end}
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      disabled={saving}
                    />
                  </label>
                </div>

                <label className={styles.label}>
                  {t.calendar.noteOptional}
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={saving}
                    placeholder={t.calendar.notePlaceholder}
                  />
                </label>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={closeModal}
                    disabled={saving}
                  >
                    {t.calendar.cancel}
                  </button>

                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? t.calendar.saving : t.calendar.create}
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