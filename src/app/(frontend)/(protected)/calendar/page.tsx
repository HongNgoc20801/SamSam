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

type ParentOption = {
  id: string | number
  fullName: string
  email?: string
}

type EventType =
  | 'handover'
  | 'pickup'
  | 'dropoff'
  | 'school'
  | 'activity'
  | 'medical'
  | 'expense-related'
  | 'other'

type EventPriority = 'normal' | 'important' | 'urgent'
type ConfirmationStatus = 'not-required' | 'pending' | 'confirmed' | 'declined'

type RelationValue =
  | string
  | number
  | {
      id: string | number
      fullName?: string
      name?: string
      email?: string
    }

type CalEventDoc = {
  id: string | number
  title: string
  notes?: string
  startAt: string
  endAt: string
  allDay?: boolean
  eventType?: EventType
  priority?: EventPriority
  location?: string
  requiresConfirmation?: boolean
  confirmationStatus?: ConfirmationStatus
  child?: RelationValue
  handoverFrom?: RelationValue
  handoverTo?: RelationValue
  responsibleParent?: RelationValue
  confirmedBy?: RelationValue
  confirmedAt?: string
  createdBy?: RelationValue
}

type RBCResource = {
  notes?: string
  childId?: string
  childName?: string
  eventType?: EventType
  priority?: EventPriority
  location?: string
  requiresConfirmation?: boolean
  confirmationStatus?: ConfirmationStatus
  handoverFromId?: string
  handoverFromName?: string
  handoverToId?: string
  handoverToName?: string
  responsibleParentId?: string
  responsibleParentName?: string
  confirmedById?: string
  confirmedByName?: string
  confirmedAt?: string
  createdById?: string
}

type RBCEvent = RBCBaseEvent & {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource: RBCResource
}

function normalizeID(v: string) {
  const t = String(v ?? '').trim()
  return /^\d+$/.test(t) ? Number(t) : t
}

function getRelId(v: RelationValue | undefined | null) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return v?.id != null ? String(v.id) : ''
}

function getRelName(v: RelationValue | undefined | null) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return v.fullName || v.name || v.email || ''
}

function toEventType(value: unknown): EventType {
  const allowed: EventType[] = [
    'handover',
    'pickup',
    'dropoff',
    'school',
    'activity',
    'medical',
    'expense-related',
    'other',
  ]
  return allowed.includes(value as EventType) ? (value as EventType) : 'other'
}

function toPriority(value: unknown): EventPriority {
  const allowed: EventPriority[] = ['normal', 'important', 'urgent']
  return allowed.includes(value as EventPriority) ? (value as EventPriority) : 'normal'
}

function toConfirmationStatus(value: unknown): ConfirmationStatus {
  const allowed: ConfirmationStatus[] = [
    'not-required',
    'pending',
    'confirmed',
    'declined',
  ]
  return allowed.includes(value as ConfirmationStatus)
    ? (value as ConfirmationStatus)
    : 'not-required'
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

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  handover: '#2563EB',          
  pickup: '#0D9488',           
  dropoff: '#F59E0B',           
  school: '#22C55E',            
  activity: '#8B5CF6',          
  medical: '#EF4444',          
  'expense-related': '#EC4899', 
  other: '#64748B',             
}
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  handover: 'Handover',
  pickup: 'Pickup',
  dropoff: 'Drop-off',
  school: 'School',
  activity: 'Activity',
  medical: 'Medical',
  'expense-related': 'Expense',
  other: 'Other',
}

const PRIORITY_LABELS: Record<EventPriority, string> = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
}

const CONFIRMATION_LABELS: Record<ConfirmationStatus, string> = {
  'not-required': 'Not required',
  pending: 'Pending',
  confirmed: 'Confirmed',
  declined: 'Declined',
}

function getEventColor(type?: EventType) {
  return EVENT_TYPE_COLORS[toEventType(type)]
}

export default function CalendarPage() {
  const t = useTranslations()

  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<Child[]>([])
  const [parents, setParents] = useState<ParentOption[]>([])
  const [docs, setDocs] = useState<CalEventDoc[]>([])
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const [filterChild, setFilterChild] = useState<'all' | string>('all')

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'view' | 'edit'>('create')
  const [activeEvent, setActiveEvent] = useState<RBCEvent | null>(null)

  const [childId, setChildId] = useState('')
  const [eventType, setEventType] = useState<EventType>('other')
  const [priority, setPriority] = useState<EventPriority>('normal')
  const [location, setLocation] = useState('')
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)
  const [confirmationStatus, setConfirmationStatus] =
    useState<ConfirmationStatus>('not-required')
  const [handoverFrom, setHandoverFrom] = useState('')
  const [handoverTo, setHandoverTo] = useState('')
  const [responsibleParent, setResponsibleParent] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<any>(Views.MONTH)

  const hasChildren = children.length > 0

  const childNameById = useMemo(() => {
    const m = new Map<string, string>()
    children.forEach((c) => m.set(String(c.id), c.fullName))
    return m
  }, [children])

  const parentNameById = useMemo(() => {
    const m = new Map<string, string>()
    parents.forEach((p) => {
      m.set(String(p.id), p.fullName || p.email || String(p.id))
    })
    return m
  }, [parents])

  async function loadAll() {
    setLoading(true)
    setError('')

    try {
      const [cRes, eRes, pRes, meRes] = await Promise.all([
        fetch('/api/children?limit=100&sort=createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/calendar-events?limit=500&sort=-startAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/customers?limit=50&sort=createdAt&depth=0', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/customers/me', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])

      const [cRaw, eRaw, pRaw, meRaw] = await Promise.all([
        cRes.text(),
        eRes.text(),
        pRes.text(),
        meRes.text(),
      ])

      let cData: any = {}
      let eData: any = {}
      let pData: any = {}
      let meData: any = {}

      try {
        cData = JSON.parse(cRaw)
      } catch {}
      try {
        eData = JSON.parse(eRaw)
      } catch {}
      try {
        pData = JSON.parse(pRaw)
      } catch {}
      try {
        meData = JSON.parse(meRaw)
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

      if (!pRes.ok) {
        throw new Error(
          pData?.message || pData?.errors?.[0]?.message || pRaw || `Customers failed: ${pRes.status}`,
        )
      }

      if (!meRes.ok) {
        throw new Error(
          meData?.message || meData?.errors?.[0]?.message || meRaw || `Me failed: ${meRes.status}`,
        )
      }

      setChildren(cData?.docs ?? [])
      setDocs(eData?.docs ?? [])
      setParents(
        (pData?.docs ?? []).map((p: any) => ({
          id: p.id,
          fullName: p.fullName || p.name || p.email || `Parent ${p.id}`,
          email: p.email,
        })),
      )
      setCurrentUserId(String(meData?.user?.id || meData?.id || ''))
    } catch (err: any) {
      setError(err?.message || t.calendar.networkError || 'Network error')
      setChildren([])
      setDocs([])
      setParents([])
      setCurrentUserId('')
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

        const childIdResolved = getRelId(d.child) || undefined
        const handoverFromIdResolved = getRelId(d.handoverFrom) || undefined
        const handoverToIdResolved = getRelId(d.handoverTo) || undefined
        const responsibleParentIdResolved = getRelId(d.responsibleParent) || undefined
        const confirmedByIdResolved = getRelId(d.confirmedBy) || undefined
        const createdByIdResolved = getRelId(d.createdBy) || undefined

        const childNameResolved = childIdResolved
          ? childNameById.get(childIdResolved) || getRelName(d.child)
          : getRelName(d.child)

        const handoverFromNameResolved =
          getRelName(d.handoverFrom) ||
          (handoverFromIdResolved ? parentNameById.get(handoverFromIdResolved) : undefined)

        const handoverToNameResolved =
          getRelName(d.handoverTo) ||
          (handoverToIdResolved ? parentNameById.get(handoverToIdResolved) : undefined)

        const responsibleParentNameResolved =
          getRelName(d.responsibleParent) ||
          (responsibleParentIdResolved
            ? parentNameById.get(responsibleParentIdResolved)
            : undefined)

        const confirmedByNameResolved =
          getRelName(d.confirmedBy) ||
          (confirmedByIdResolved ? parentNameById.get(confirmedByIdResolved) : undefined)

        const ev: RBCEvent = {
          id: String(d.id),
          title: d.title,
          start,
          end,
          allDay: Boolean(d.allDay),
          resource: {
            notes: d.notes,
            childId: childIdResolved,
            childName: childNameResolved,
            eventType: toEventType(d.eventType),
            priority: toPriority(d.priority),
            location: d.location,
            requiresConfirmation: Boolean(d.requiresConfirmation),
            confirmationStatus: toConfirmationStatus(d.confirmationStatus),
            handoverFromId: handoverFromIdResolved,
            handoverFromName: handoverFromNameResolved,
            handoverToId: handoverToIdResolved,
            handoverToName: handoverToNameResolved,
            responsibleParentId: responsibleParentIdResolved,
            responsibleParentName: responsibleParentNameResolved,
            confirmedById: confirmedByIdResolved,
            confirmedByName: confirmedByNameResolved,
            confirmedAt: d.confirmedAt,
            createdById: createdByIdResolved,
          },
        }

        return ev
      })
      .filter(Boolean) as RBCEvent[]

    if (filterChild === 'all') return mapped
    return mapped.filter((e) => e.resource.childId === filterChild)
  }, [docs, childNameById, parentNameById, filterChild])

  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const ev of events) {
      const color = getEventColor(ev.resource.eventType)
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
    setEventType('other')
    setPriority('normal')
    setLocation('')
    setRequiresConfirmation(false)
    setConfirmationStatus('not-required')
    setHandoverFrom('')
    setHandoverTo('')
    setResponsibleParent('')
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
    setEventType(toEventType(ev.resource.eventType))
    setPriority(toPriority(ev.resource.priority))
    setLocation(ev.resource.location ?? '')
    setRequiresConfirmation(Boolean(ev.resource.requiresConfirmation))
    setConfirmationStatus(toConfirmationStatus(ev.resource.confirmationStatus))
    setHandoverFrom(ev.resource.handoverFromId ?? '')
    setHandoverTo(ev.resource.handoverToId ?? '')
    setResponsibleParent(ev.resource.responsibleParentId ?? '')
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

  function validateForm() {
    if (!hasChildren) return 'Please add a child before creating an event.'
    if (!childId) return 'Please select a child.'
    if (!title.trim()) return 'Title is required.'
    if (!startAt || !endAt) return 'Start and end time are required.'

    const { startD, endD } = normalizeTimes(startAt, endAt)
    if (endD.getTime() <= startD.getTime()) return 'End time must be after start time.'

    if (requiresConfirmation && confirmationStatus === 'not-required') {
      return 'Confirmation status cannot be "not required" when confirmation is enabled.'
    }

    if (eventType === 'handover') {
      if (!location.trim()) return 'Handover location is required.'
      if (!handoverFrom) return 'Please select who is handing over the child.'
      if (!handoverTo) return 'Please select who is receiving the child.'
      if (handoverFrom === handoverTo) return 'Handover from and to cannot be the same parent.'
    }

    return ''
  }

  function buildPayload() {
    const { startD, endD } = normalizeTimes(startAt, endAt)

    return {
      child: normalizeID(childId),
      title: title.trim(),
      notes: notes.trim() || undefined,
      startAt: startD.toISOString(),
      endAt: endD.toISOString(),
      eventType,
      priority,
      location: location.trim() || undefined,
      requiresConfirmation,
      confirmationStatus: requiresConfirmation ? confirmationStatus : 'not-required',
      handoverFrom:
        eventType === 'handover' && handoverFrom ? normalizeID(handoverFrom) : null,
      handoverTo: eventType === 'handover' && handoverTo ? normalizeID(handoverTo) : null,
      responsibleParent: responsibleParent ? normalizeID(responsibleParent) : null,
    }
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setError('')

    const validationError = validateForm()
    if (validationError) return setError(validationError)

    setSaving(true)

    try {
      const res = await fetch('/api/calendar-events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })

      const raw = await res.text()
      let j: any = {}

      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Failed to create event.'
        throw new Error(msg)
      }

      resetForm()
      setOpen(false)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function updateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !activeEvent) return
    setError('')

    const validationError = validateForm()
    if (validationError) return setError(validationError)

    setSaving(true)

    try {
      const res = await fetch(`/api/calendar-events/${activeEvent.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })

      const raw = await res.text()
      let j: any = {}

      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Failed to update event.'
        throw new Error(msg)
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
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
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Failed to delete event.'
        throw new Error(msg)
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    }
  }

  async function updateConfirmation(nextStatus: 'confirmed' | 'declined') {
    if (!activeEvent || confirming) return

    setConfirming(true)
    setError('')

    try {
      const res = await fetch(`/api/calendar-events/${activeEvent.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationStatus: nextStatus,
        }),
      })

      const raw = await res.text()
      let j: any = {}

      try {
        j = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        const msg = j?.message || j?.errors?.[0]?.message || raw || 'Failed to update confirmation.'
        throw new Error(msg)
      }

      await loadAll()
      closeModal()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setConfirming(false)
    }
  }

  function Toolbar(props: any) {
    const { label, onNavigate, onView } = props

    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button type="button" className={styles.navBtn} onClick={() => onNavigate('TODAY')}>
            {t.calendar.today || 'Today'}
          </button>

          <div className={styles.navArrows}>
            <button
              type="button"
              className={styles.iconNav}
              onClick={() => onNavigate('PREV')}
              aria-label={t.calendar.prev || 'Previous'}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.iconNav}
              onClick={() => onNavigate('NEXT')}
              aria-label={t.calendar.next || 'Next'}
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
              {t.calendar.month || 'Month'}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.WEEK ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.WEEK)
                onView(Views.WEEK)
              }}
            >
              {t.calendar.week || 'Week'}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.DAY ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.DAY)
                onView(Views.DAY)
              }}
            >
              {t.calendar.day || 'Day'}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.AGENDA ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.AGENDA)
                onView(Views.AGENDA)
              }}
            >
              {t.calendar.agenda || 'Agenda'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function MonthEvent({ event }: { event: RBCEvent }) {
    const color = getEventColor(event.resource.eventType)

    return (
      <div className={styles.monthEvent}>
        <span className={styles.monthBar} style={{ backgroundColor: color }} />
        <span className={styles.monthTitle}>{event.title}</span>
      </div>
    )
  }

  function TimeEvent({ event }: { event: RBCEvent }) {
    const time = `${format(event.start, 'HH:mm')}–${format(event.end, 'HH:mm')}`

    return (
      <div className={styles.timeEventRow} title={`${event.title} • ${time}`}>
        <span className={styles.timeEventTitle}>{event.title}</span>
        <span className={styles.timeEventSep}>•</span>
        <span className={styles.timeEventTimeInline}>{time}</span>
      </div>
    )
  }

  function DayEvent({ event }: { event: RBCEvent }) {
    const time = `${format(event.start, 'HH:mm')}–${format(event.end, 'HH:mm')}`
    const safeType = toEventType(event.resource.eventType)
    const safeConfirmation = toConfirmationStatus(event.resource.confirmationStatus)

    return (
      <div className={styles.dayEvent} title={`${event.title} • ${time}`}>
        <div className={styles.dayEventTop}>
          <span className={styles.dayEventTitle}>{event.title}</span>
          <span className={styles.dayEventTime}>{time}</span>
        </div>

        <div className={styles.daySubRow}>
          {event.resource.childName ? <div className={styles.dayEventSub}>{event.resource.childName}</div> : null}
          <span className={styles.inlineMetaTag}>{EVENT_TYPE_LABELS[safeType]}</span>
          {safeConfirmation === 'pending' ? (
            <span className={styles.inlineMetaTag}>Needs confirmation</span>
          ) : null}
        </div>
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

  const TYPE_CLASS: Record<EventType, string> = {
    handover: styles.evtHandover,
    pickup: styles.evtPickup,
    dropoff: styles.evtDropoff,
    school: styles.evtSchool,
    activity: styles.evtActivity,
    medical: styles.evtMedical,
    'expense-related': styles.evtExpense,
    other: styles.evtOther,
  }

  const confirmationClassMap: Record<ConfirmationStatus, string> = {
    'not-required': styles.status_not_required,
    pending: styles.status_pending,
    confirmed: styles.status_confirmed,
    declined: styles.status_declined,
  }

  if (loading) return <div className={styles.loading}>{t.calendar.loading || 'Loading...'}</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>{t.calendar.title || 'Calendar'}</h1>
          <p className={styles.subtitle}>
            Structured child events, handovers, confirmations and responsibilities.
          </p>
        </div>

        <div className={styles.topActions}>
          <label className={styles.filterLabel}>
            {t.calendar.filterChild || 'Filter child'}
            <select
              className={styles.select}
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              disabled={!hasChildren}
            >
              <option value="all">{t.calendar.allChildren || 'All children'}</option>
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
            title={!hasChildren ? 'Add a child first' : 'Create event'}
            onClick={() => {
              const now = new Date()
              const end = new Date(now.getTime() + 30 * 60 * 1000)
              openCreateWithRange(now, end)
            }}
          >
            {t.calendar.newEvent || 'New event'}
          </button>
        </div>
      </div>

      {!hasChildren ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>You need at least one child profile before creating events.</p>
          <Link className={styles.linkBtn} href="/child-info/new">
            Add child
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error}>
          {t.calendar.errorPrefix || 'Error:'} {error}
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
          showMultiDayTimes
          onSelectSlot={(slot: SlotInfo) => {
            if (!hasChildren) return
            openCreateWithRange(slot.start as Date, slot.end as Date)
          }}
          onSelectEvent={(ev: RBCEvent) => {
            setMode('view')
            setActiveEvent(ev)
            setOpen(true)
          }}
          tooltipAccessor={(ev: RBCEvent) =>
            [
              ev.resource.childName,
              ev.resource.location,
              toConfirmationStatus(ev.resource.confirmationStatus) === 'pending'
                ? 'Needs confirmation'
                : '',
            ]
              .filter(Boolean)
              .join(' • ')
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
          scrollToTime={new Date(1970, 0, 1, 7, 0)}
          step={30}
          timeslots={2}
          eventPropGetter={(ev: RBCEvent) => {
            const type = toEventType(ev.resource.eventType)
            if (view === Views.MONTH) return { className: styles.evtMonth }
            return { className: `${styles.evt} ${TYPE_CLASS[type]}` }
          }}
        />
      </div>

      {open ? (
        <div className={styles.modalBackdrop} onMouseDown={closeModal}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            {mode === 'view' && activeEvent ? (
              (() => {
                const type = toEventType(activeEvent.resource.eventType)
                const priorityValue = toPriority(activeEvent.resource.priority)
                const confirmState = toConfirmationStatus(activeEvent.resource.confirmationStatus)

                const childName = activeEvent.resource.childName || ''
                const initials = getInitials(childName)

                const startDate = format(activeEvent.start, 'dd.MM.yyyy')
                const endDate = format(activeEvent.end, 'dd.MM.yyyy')
                const dateText = startDate === endDate ? startDate : `${startDate} → ${endDate}`
                const timeText = `${format(activeEvent.start, 'HH:mm')} → ${format(
                  activeEvent.end,
                  'HH:mm',
                )}`

                const canCurrentUserConfirm =
                  Boolean(activeEvent.resource.requiresConfirmation) &&
                  confirmState === 'pending' &&
                  Boolean(currentUserId) &&
                  String(activeEvent.resource.createdById || '') !== String(currentUserId)

                return (
                  <div className={styles.detailWrap}>
                    <div className={styles.detailTopAccent} style={{ background: getEventColor(type) }} />

                    <div className={styles.detailHeader}>
                      <div className={styles.detailType}>
                        <span className={styles.detailTypeIcon}>🔖</span>
                        <span className={styles.detailTypeText}>{EVENT_TYPE_LABELS[type]}</span>
                      </div>

                      <button
                        type="button"
                        className={styles.detailClose}
                        onClick={closeModal}
                        aria-label="Close"
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

                      <span className={styles.metaBadge}>{PRIORITY_LABELS[priorityValue]}</span>

                      <span className={`${styles.badgeStatus} ${confirmationClassMap[confirmState]}`}>
                        <span className={styles.badgeStatusIcon}>!</span>
                        <span className={styles.badgeText}>{CONFIRMATION_LABELS[confirmState]}</span>
                      </span>
                    </div>

                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>📅</span> Date
                        </div>
                        <div className={styles.infoValue}>{dateText}</div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>🕒</span> Time
                        </div>
                        <div className={styles.infoValue}>{timeText}</div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>📍</span> Location
                        </div>
                        <div className={styles.infoValue}>{activeEvent.resource.location || 'Not specified'}</div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>👤</span> Responsible
                        </div>
                        <div className={styles.infoValue}>
                          {activeEvent.resource.responsibleParentName || 'Not assigned'}
                        </div>
                      </div>
                    </div>

                    {type === 'handover' ? (
                      <div className={styles.handoverPanel}>
                        <div className={styles.handoverTitle}>Handover details</div>
                        <div className={styles.handoverRow}>
                          <div className={styles.handoverBox}>
                            <div className={styles.handoverLabel}>From</div>
                            <div className={styles.handoverValue}>
                              {activeEvent.resource.handoverFromName || 'Not set'}
                            </div>
                          </div>

                          <div className={styles.handoverArrow}>→</div>

                          <div className={styles.handoverBox}>
                            <div className={styles.handoverLabel}>To</div>
                            <div className={styles.handoverValue}>
                              {activeEvent.resource.handoverToName || 'Not set'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.descSection}>
                      <div className={styles.descLabel}>Notes</div>
                      <div className={styles.descBox}>
                        {activeEvent.resource.notes ? (
                          activeEvent.resource.notes
                        ) : (
                          <span className={styles.descMuted}>No notes added yet.</span>
                        )}
                      </div>
                    </div>

                    {canCurrentUserConfirm ? (
                      <div className={styles.confirmationActions}>
                        <button
                          type="button"
                          className={styles.confirmBtn}
                          onClick={() => updateConfirmation('confirmed')}
                          disabled={confirming}
                        >
                          {confirming ? 'Saving...' : 'Confirm'}
                        </button>

                        <button
                          type="button"
                          className={styles.declineBtn}
                          onClick={() => updateConfirmation('declined')}
                          disabled={confirming}
                        >
                          {confirming ? 'Saving...' : 'Decline'}
                        </button>
                      </div>
                    ) : null}

                    <div className={styles.detailFooter}>
                      <button type="button" className={styles.actionClose} onClick={closeModal}>
                        Close
                      </button>

                      <button
                        type="button"
                        className={styles.actionDelete}
                        onClick={() => deleteEvent(activeEvent.id)}
                      >
                        Delete
                      </button>

                      <button
                        type="button"
                        className={styles.actionEdit}
                        onClick={() => {
                          fillFormFromEvent(activeEvent)
                          setMode('edit')
                        }}
                      >
                        Edit event
                      </button>
                    </div>
                  </div>
                )
              })()
            ) : mode === 'edit' ? (
              <form className={styles.form} onSubmit={updateEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>Edit event</div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setMode('view')}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  Child
                  <select
                    className={styles.select}
                    value={childId}
                    onChange={(ev) => setChildId(ev.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select child</option>
                    {children.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.fullName} {c.status ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Event type
                    <select
                      className={styles.select}
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventType)}
                      disabled={saving}
                    >
                      <option value="handover">Handover</option>
                      <option value="pickup">Pickup</option>
                      <option value="dropoff">Drop-off</option>
                      <option value="school">School</option>
                      <option value="activity">Activity</option>
                      <option value="medical">Medical</option>
                      <option value="expense-related">Expense related</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className={styles.label}>
                    Priority
                    <select
                      className={styles.select}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as EventPriority)}
                      disabled={saving}
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                </div>

                <label className={styles.label}>
                  Title
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(ev) => setTitle(ev.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className={styles.label}>
                  Location
                  <input
                    className={styles.input}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving}
                    placeholder="School entrance / Parent B house / Clinic"
                  />
                </label>

                <label className={styles.label}>
                  Responsible parent
                  <select
                    className={styles.select}
                    value={responsibleParent}
                    onChange={(e) => setResponsibleParent(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select parent</option>
                    {parents.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>

                {eventType === 'handover' ? (
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      Handover from
                      <select
                        className={styles.select}
                        value={handoverFrom}
                        onChange={(e) => setHandoverFrom(e.target.value)}
                        disabled={saving}
                      >
                        <option value="">Select parent</option>
                        {parents.map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.label}>
                      Handover to
                      <select
                        className={styles.select}
                        value={handoverTo}
                        onChange={(e) => setHandoverTo(e.target.value)}
                        disabled={saving}
                      >
                        <option value="">Select parent</option>
                        {parents.map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={requiresConfirmation}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setRequiresConfirmation(checked)
                      if (!checked) {
                        setConfirmationStatus('not-required')
                      } else if (confirmationStatus === 'not-required') {
                        setConfirmationStatus('pending')
                      }
                    }}
                    disabled={saving}
                  />
                  Requires confirmation from the other parent
                </label>

                {requiresConfirmation ? (
                  <label className={styles.label}>
                    Confirmation status
                    <select
                      className={styles.select}
                      value={confirmationStatus}
                      onChange={(e) =>
                        setConfirmationStatus(e.target.value as ConfirmationStatus)
                      }
                      disabled={saving}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>
                ) : null}

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
                    End
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
                  Notes
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(ev) => setNotes(ev.target.value)}
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
                    Cancel
                  </button>
                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <form className={styles.form} onSubmit={createEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>Create event</div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  Child
                  <select
                    className={styles.select}
                    value={childId}
                    onChange={(ev) => setChildId(ev.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select child</option>
                    {children.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.fullName} {c.status ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    Event type
                    <select
                      className={styles.select}
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventType)}
                      disabled={saving}
                    >
                      <option value="handover">Handover</option>
                      <option value="pickup">Pickup</option>
                      <option value="dropoff">Drop-off</option>
                      <option value="school">School</option>
                      <option value="activity">Activity</option>
                      <option value="medical">Medical</option>
                      <option value="expense-related">Expense related</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className={styles.label}>
                    Priority
                    <select
                      className={styles.select}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as EventPriority)}
                      disabled={saving}
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                </div>

                <label className={styles.label}>
                  Title
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(ev) => setTitle(ev.target.value)}
                    disabled={saving}
                    placeholder="Example: Friday handover / School meeting / Football practice"
                  />
                </label>

                <label className={styles.label}>
                  Location
                  <input
                    className={styles.input}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving}
                    placeholder="School entrance / Parent B house / Clinic"
                  />
                </label>

                <label className={styles.label}>
                  Responsible parent
                  <select
                    className={styles.select}
                    value={responsibleParent}
                    onChange={(e) => setResponsibleParent(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Select parent</option>
                    {parents.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>

                {eventType === 'handover' ? (
                  <div className={styles.formRow}>
                    <label className={styles.label}>
                      Handover from
                      <select
                        className={styles.select}
                        value={handoverFrom}
                        onChange={(e) => setHandoverFrom(e.target.value)}
                        disabled={saving}
                      >
                        <option value="">Select parent</option>
                        {parents.map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.label}>
                      Handover to
                      <select
                        className={styles.select}
                        value={handoverTo}
                        onChange={(e) => setHandoverTo(e.target.value)}
                        disabled={saving}
                      >
                        <option value="">Select parent</option>
                        {parents.map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={requiresConfirmation}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setRequiresConfirmation(checked)
                      if (!checked) {
                        setConfirmationStatus('not-required')
                      } else if (confirmationStatus === 'not-required') {
                        setConfirmationStatus('pending')
                      }
                    }}
                    disabled={saving}
                  />
                  Requires confirmation from the other parent
                </label>

                {requiresConfirmation ? (
                  <label className={styles.label}>
                    Confirmation status
                    <select
                      className={styles.select}
                      value={confirmationStatus}
                      onChange={(e) =>
                        setConfirmationStatus(e.target.value as ConfirmationStatus)
                      }
                      disabled={saving}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>
                ) : null}

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
                    End
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
                  Notes
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(ev) => setNotes(ev.target.value)}
                    disabled={saving}
                    placeholder="Short, structured notes only."
                  />
                </label>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Create'}
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