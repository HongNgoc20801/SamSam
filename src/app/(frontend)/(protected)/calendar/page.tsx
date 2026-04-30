'use client'

import { Children, cloneElement, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './calendar.module.css'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  Views,
  type SlotInfo,
  type Event as RBCBaseEvent,
} from 'react-big-calendar'
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  startOfDay,
} from 'date-fns'
import { nb, enGB } from 'date-fns/locale'
import { useTranslations } from '@/app/lib/i18n/useTranslations'
import { useSettings } from '@/app/(frontend)/components/providers/SettingsProvider'

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
  | 'pickup'
  | 'dropoff'
  | 'school'
  | 'activity'
  | 'medical'
  | 'payment'
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
      firstName?: string
      lastName?: string
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
  linkedEconomyTransaction?: string | number | null
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
  linkedEconomyTransaction?: string
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

function getRelDisplayName(
  v: RelationValue | undefined | null,
  nameMap?: Map<string, string>,
) {
  if (v == null) return ''

  if (typeof v === 'string' || typeof v === 'number') {
    const id = String(v)
    return nameMap?.get(id) || id
  }

  const id = v?.id != null ? String(v.id) : ''
  const full =
    `${String(v?.firstName || '').trim()} ${String(v?.lastName || '').trim()}`.trim()

  return v.fullName || v.name || full || (id ? nameMap?.get(id) || '' : '') || v.email || ''
}

function toEventType(value: unknown): EventType {
  const allowed: EventType[] = [
    'pickup',
    'dropoff',
    'school',
    'activity',
    'medical',
    'payment',
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

const locales = {
  'no-NO': nb,
  'en-GB': enGB,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date, options?: any) =>
    startOfWeek(date, { locale: options?.locale || nb }),
  getDay,
  locales,
})

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  pickup: '#0D9488',
  dropoff: '#F59E0B',
  school: '#22C55E',
  activity: '#8B5CF6',
  medical: '#EF4444',
  payment: '#EC4899',
  other: '#64748B',
}

function getEventColor(type?: EventType) {
  return EVENT_TYPE_COLORS[toEventType(type)]
}

export default function CalendarPage() {
  const t = useTranslations()
  const tc = t.calendar
  const searchParams = useSearchParams()
  const eventIdFromQuery = searchParams.get('event')
  const { settings } = useSettings()

  const culture = settings?.language === 'en' ? 'en-GB' : 'no-NO'
  const dateLocale = settings?.language === 'en' ? enGB : nb

  const EVENT_TYPE_LABELS = useMemo<Record<EventType, string>>(
    () => ({
      pickup: tc.eventTypePickup,
      dropoff: tc.eventTypeDropoff,
      school: tc.eventTypeSchool,
      activity: tc.eventTypeActivity,
      medical: tc.eventTypeMedical,
      payment: tc.eventTypePayment,
      other: tc.eventTypeOther,
    }),
    [tc],
  )

  const PRIORITY_LABELS = useMemo<Record<EventPriority, string>>(
    () => ({
      normal: tc.priorityNormal,
      important: tc.priorityImportant,
      urgent: tc.priorityUrgent,
    }),
    [tc],
  )

  const CONFIRMATION_LABELS = useMemo<Record<ConfirmationStatus, string>>(
    () => ({
      'not-required': tc.confirmationNotRequired,
      pending: tc.confirmationPending,
      confirmed: tc.confirmationConfirmed,
      declined: tc.confirmationDeclined,
    }),
    [tc],
  )

  function getConfirmationMeta(
    status?: ConfirmationStatus,
    requiresConfirmation?: boolean,
  ) {
    const safe = toConfirmationStatus(status)

    if (!requiresConfirmation || safe === 'not-required') {
      return {
        icon: '—',
        label: tc.confirmationNotRequired,
        short: 'NR',
      }
    }

    if (safe === 'pending') {
      return {
        icon: '⏳',
        label: tc.confirmationPending,
        short: 'P',
      }
    }

    if (safe === 'confirmed') {
      return {
        icon: '✅',
        label: tc.confirmationConfirmed,
        short: 'OK',
      }
    }

    return {
      icon: '❌',
      label: tc.confirmationDeclined,
      short: 'NO',
    }
  }

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
        fetch('/api/customers?limit=200&sort=createdAt&depth=0', {
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
          fullName:
            p.fullName ||
            p.name ||
            `${String(p?.firstName || '').trim()} ${String(p?.lastName || '').trim()}`.trim() ||
            p.email ||
            `Parent ${p.id}`,
          email: p.email,
        })),
      )
      setCurrentUserId(String(meData?.user?.id || meData?.id || ''))
    } catch (err: any) {
      setError(err?.message || tc.networkError)
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

        const childNameResolved = getRelDisplayName(d.child, childNameById)
        const handoverFromNameResolved = getRelDisplayName(d.handoverFrom, parentNameById)
        const handoverToNameResolved = getRelDisplayName(d.handoverTo, parentNameById)
        const responsibleParentNameResolved = getRelDisplayName(
          d.responsibleParent,
          parentNameById,
        )
        const confirmedByNameResolved = getRelDisplayName(d.confirmedBy, parentNameById)

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
            linkedEconomyTransaction: d.linkedEconomyTransaction
              ? String(d.linkedEconomyTransaction)
              : undefined,
          },
        }

        return ev
      })
      .filter(Boolean) as RBCEvent[]

    if (filterChild === 'all') return mapped
    return mapped.filter((e) => e.resource.childId === filterChild)
  }, [docs, childNameById, parentNameById, filterChild])

  useEffect(() => {
    if (!eventIdFromQuery || !events.length) return

    const matched = events.find((ev) => String(ev.id) === String(eventIdFromQuery))
    if (!matched) return

    setCurrentDate(matched.start)
    setMode('view')
    setActiveEvent(matched)
    setOpen(true)
  }, [eventIdFromQuery, events])

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
    if (!hasChildren) return tc.validationNeedChildProfile
    if (!childId) return tc.validationSelectChild
    if (!title.trim()) return tc.validationTitleRequired
    if (!startAt || !endAt) return tc.validationStartEndRequired

    const { startD, endD } = normalizeTimes(startAt, endAt)
    if (endD.getTime() <= startD.getTime()) return tc.validationEndAfterStart

    if (requiresConfirmation && confirmationStatus === 'not-required') {
      return tc.validationConfirmationInvalid
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
        const msg = j?.message || j?.errors?.[0]?.message || raw || tc.createFailed
        throw new Error(msg)
      }

      resetForm()
      setOpen(false)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || tc.genericError)
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
        const msg = j?.message || j?.errors?.[0]?.message || raw || tc.updateFailed
        throw new Error(msg)
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || tc.genericError)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm(tc.confirmDeleteEvent)) return
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
        const msg = j?.message || j?.errors?.[0]?.message || raw || tc.deleteFailed
        throw new Error(msg)
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || tc.genericError)
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
        const msg =
          j?.message || j?.errors?.[0]?.message || raw || tc.updateConfirmationFailed
        throw new Error(msg)
      }

      await loadAll()
      closeModal()
    } catch (err: any) {
      setError(err?.message || tc.genericError)
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
            {tc.today}
          </button>

          <div className={styles.navArrows}>
            <button
              type="button"
              className={styles.iconNav}
              onClick={() => onNavigate('PREV')}
              aria-label={tc.prev}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.iconNav}
              onClick={() => onNavigate('NEXT')}
              aria-label={tc.next}
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
              {tc.month}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.WEEK ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.WEEK)
                onView(Views.WEEK)
              }}
            >
              {tc.week}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.DAY ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.DAY)
                onView(Views.DAY)
              }}
            >
              {tc.day}
            </button>

            <button
              type="button"
              className={`${styles.viewBtn} ${view === Views.AGENDA ? styles.activeView : ''}`}
              onClick={() => {
                setView(Views.AGENDA)
                onView(Views.AGENDA)
              }}
            >
              {tc.agenda}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function MonthEvent({ event }: { event: RBCEvent }) {
    const color = getEventColor(event.resource.eventType)
    const confirmation = getConfirmationMeta(
      event.resource.confirmationStatus,
      event.resource.requiresConfirmation,
    )

    return (
      <div className={styles.monthEvent}>
        <span className={styles.monthBar} style={{ backgroundColor: color }} />
        <span className={styles.monthStatusIcon} title={confirmation.label}>
          {confirmation.icon}
        </span>
        <span className={styles.monthTitle}>{event.title}</span>
      </div>
    )
  }

  function TimeEvent({ event }: { event: RBCEvent }) {
    const time = `${format(event.start, 'HH:mm')}–${format(event.end, 'HH:mm')}`
    const confirmation = getConfirmationMeta(
      event.resource.confirmationStatus,
      event.resource.requiresConfirmation,
    )

    return (
      <div className={styles.timeEventRow} title={`${event.title} • ${time} • ${confirmation.label}`}>
        <span className={styles.timeEventStatus} aria-hidden="true">
          {confirmation.icon}
        </span>
        <span className={styles.timeEventTitle}>{event.title}</span>
        <span className={styles.timeEventSep}>•</span>
        <span className={styles.timeEventTimeInline}>{time}</span>
      </div>
    )
  }

  function DayEvent({ event }: { event: RBCEvent }) {
    const time = `${format(event.start, 'HH:mm')}–${format(event.end, 'HH:mm')}`
    const safeType = toEventType(event.resource.eventType)
    const confirmation = getConfirmationMeta(
      event.resource.confirmationStatus,
      event.resource.requiresConfirmation,
    )

    return (
      <div className={styles.dayEvent} title={`${event.title} • ${time} • ${confirmation.label}`}>
        <div className={styles.dayEventTop}>
          <span className={styles.dayEventTitle}>
            <span className={styles.dayEventStatusIcon} aria-hidden="true">
              {confirmation.icon}
            </span>{' '}
            {event.title}
          </span>
          <span className={styles.dayEventTime}>{time}</span>
        </div>

        <div className={styles.daySubRow}>
          {event.resource.childName ? (
            <div className={styles.dayEventSub}>{event.resource.childName}</div>
          ) : null}
          <span className={styles.inlineMetaTag}>{EVENT_TYPE_LABELS[safeType]}</span>
          <span className={styles.inlineMetaTag}>{confirmation.label}</span>
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
    pickup: styles.evtPickup,
    dropoff: styles.evtDropoff,
    school: styles.evtSchool,
    activity: styles.evtActivity,
    medical: styles.evtMedical,
    payment: styles.evtExpense,
    other: styles.evtOther,
  }

  const confirmationClassMap: Record<ConfirmationStatus, string> = {
    'not-required': styles.status_not_required,
    pending: styles.status_pending,
    confirmed: styles.status_confirmed,
    declined: styles.status_declined,
  }

  if (loading) return <div className={styles.loading}>{tc.loading}</div>

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>{tc.title}</h1>
          <p className={styles.subtitle}>{tc.subtitle}</p>
        </div>

        <div className={styles.topActions}>
          <label className={styles.filterLabel}>
            {tc.filterChild}
            <select
              className={styles.select}
              value={filterChild}
              onChange={(e) => setFilterChild(e.target.value)}
              disabled={!hasChildren}
            >
              <option value="all">{tc.allChildren}</option>
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
            title={!hasChildren ? tc.addChildFirst : tc.newEvent}
            onClick={() => {
              const now = new Date()
              const end = new Date(now.getTime() + 30 * 60 * 1000)
              openCreateWithRange(now, end)
            }}
          >
            {tc.newEvent}
          </button>
        </div>
      </div>

      {!hasChildren ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>{tc.emptyNeedsChild}</p>
          <Link className={styles.linkBtn} href="/child-info/new">
            {tc.addChild}
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className={styles.error}>
          {tc.errorPrefix} {error}
        </p>
      ) : null}

      <div className={styles.calendarShell}>
        <BigCalendar<RBCEvent>
          culture={culture}
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
          tooltipAccessor={(ev: RBCEvent) => {
            const confirmation = getConfirmationMeta(
              ev.resource.confirmationStatus,
              ev.resource.requiresConfirmation,
            )

            return [
              ev.resource.childName,
              ev.resource.location,
              confirmation.label,
              ev.resource.handoverFromName && ev.resource.handoverToName
                ? `${ev.resource.handoverFromName} → ${ev.resource.handoverToName}`
                : '',
            ]
              .filter(Boolean)
              .join(' • ')
          }}
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
            const status = toConfirmationStatus(ev.resource.confirmationStatus)

            if (view === Views.MONTH) {
              return {
                className: `${styles.evtMonth} ${confirmationClassMap[status]}`,
              }
            }

            return {
              className: `${styles.evt} ${TYPE_CLASS[type]} ${confirmationClassMap[status]}`,
            }
          }}
          messages={{
            today: tc.today,
            previous: tc.prev,
            next: tc.next,
            month: tc.month,
            week: tc.week,
            day: tc.day,
            agenda: tc.agenda,
            date: tc.detailsDate,
            time: tc.detailsTime,
            event: tc.titleLabel,
            noEventsInRange: tc.noEventsInRange,
            showMore: (total) => `+${total} ${tc.showMore}`,
          }}
        />
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>✓</span>
          <div>
            <div className={styles.statLabel}>Hendelser</div>
            <div className={styles.statValue}>{events.length} totalt</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <div>
            <div className={styles.statLabel}>Barn</div>
            <div className={styles.statValue}>{children.length} registrert</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statIcon}>!</span>
          <div>
            <div className={styles.statLabel}>Bekreftelser</div>
            <div className={styles.statValue}>
              {events.filter((e) => e.resource.confirmationStatus === 'pending').length} venter
            </div>
          </div>
        </div>
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

                const startDate = format(activeEvent.start, 'dd.MM.yyyy', { locale: dateLocale })
                const endDate = format(activeEvent.end, 'dd.MM.yyyy', { locale: dateLocale })
                const dateText = startDate === endDate ? startDate : `${startDate} → ${endDate}`
                const timeText = `${format(activeEvent.start, 'HH:mm')} → ${format(
                  activeEvent.end,
                  'HH:mm',
                )}`

                const isEconomyGenerated = Boolean(activeEvent.resource.linkedEconomyTransaction)

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
                        aria-label={tc.close}
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
                          <span className={styles.infoIcon}>📅</span> {tc.detailsDate}
                        </div>
                        <div className={styles.infoValue}>{dateText}</div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>🕒</span> {tc.detailsTime}
                        </div>
                        <div className={styles.infoValue}>{timeText}</div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>📍</span> {tc.detailsLocation}
                        </div>
                        <div className={styles.infoValue}>
                          {activeEvent.resource.location || tc.detailsNotSpecified}
                        </div>
                      </div>

                      <div className={styles.infoCard}>
                        <div className={styles.infoLabel}>
                          <span className={styles.infoIcon}>👤</span> {tc.detailsResponsible}
                        </div>
                        <div className={styles.infoValue}>
                          {activeEvent.resource.responsibleParentName || tc.detailsNotAssigned}
                        </div>
                      </div>
                    </div>

                    <div className={styles.descSection}>
                      <div className={styles.descLabel}>{tc.detailsNotes}</div>
                      <div className={styles.descBox}>
                        {activeEvent.resource.notes ? (
                          activeEvent.resource.notes
                        ) : (
                          <span className={styles.descMuted}>{tc.detailsNoNotes}</span>
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
                          {confirming ? tc.saving : tc.confirmAction}
                        </button>

                        <button
                          type="button"
                          className={styles.declineBtn}
                          onClick={() => updateConfirmation('declined')}
                          disabled={confirming}
                        >
                          {confirming ? tc.saving : tc.declineAction}
                        </button>
                      </div>
                    ) : null}

                    <div className={styles.detailFooter}>
                      <button type="button" className={styles.actionClose} onClick={closeModal}>
                        {tc.close}
                      </button>

                      {!isEconomyGenerated ? (
                        <button
                          type="button"
                          className={styles.actionDelete}
                          onClick={() => deleteEvent(activeEvent.id)}
                        >
                          {tc.delete}
                        </button>
                      ) : null}

                      {!isEconomyGenerated ? (
                        <button
                          type="button"
                          className={styles.actionEdit}
                          onClick={() => {
                            fillFormFromEvent(activeEvent)
                            setMode('edit')
                          }}
                        >
                          {tc.editEvent}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })()
            ) : mode === 'edit' ? (
              <form className={styles.form} onSubmit={updateEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>{tc.editTitle}</div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setMode('view')}
                    aria-label={tc.close}
                  >
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  {tc.child}
                  <select
                    className={styles.select}
                    value={childId}
                    onChange={(ev) => setChildId(ev.target.value)}
                    disabled={saving}
                  >
                    <option value="">{tc.selectChild}</option>
                    {children.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.fullName} {c.status ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    {tc.eventType}
                    <select
                      className={styles.select}
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventType)}
                      disabled={saving}
                    >
                      <option value="pickup">{tc.eventTypePickup}</option>
                      <option value="dropoff">{tc.eventTypeDropoff}</option>
                      <option value="school">{tc.eventTypeSchool}</option>
                      <option value="activity">{tc.eventTypeActivity}</option>
                      <option value="medical">{tc.eventTypeMedical}</option>
                      <option value="other">{tc.eventTypeOther}</option>
                    </select>
                  </label>

                  <label className={styles.label}>
                    {tc.priority}
                    <select
                      className={styles.select}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as EventPriority)}
                      disabled={saving}
                    >
                      <option value="normal">{tc.priorityNormal}</option>
                      <option value="important">{tc.priorityImportant}</option>
                      <option value="urgent">{tc.priorityUrgent}</option>
                    </select>
                  </label>
                </div>

                <label className={styles.label}>
                  {tc.titleLabel}
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(ev) => setTitle(ev.target.value)}
                    disabled={saving}
                  />
                </label>

                <label className={styles.label}>
                  {tc.locationLabel}
                  <input
                    className={styles.input}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving}
                    placeholder={tc.placeholderLocation}
                  />
                </label>

                <label className={styles.label}>
                  {tc.responsibleParent}
                  <select
                    className={styles.select}
                    value={responsibleParent}
                    onChange={(e) => setResponsibleParent(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">{tc.selectParent}</option>
                    {parents.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>

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
                  {tc.requiresConfirmation}
                </label>

                {requiresConfirmation ? (
                  <label className={styles.label}>
                    {tc.confirmationStatus}
                    <select
                      className={styles.select}
                      value={confirmationStatus}
                      onChange={(e) =>
                        setConfirmationStatus(e.target.value as ConfirmationStatus)
                      }
                      disabled={saving}
                    >
                      <option value="pending">{tc.confirmationPending}</option>
                      <option value="confirmed">{tc.confirmationConfirmed}</option>
                      <option value="declined">{tc.confirmationDeclined}</option>
                    </select>
                  </label>
                ) : null}

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    {tc.start}
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={startAt}
                      onChange={(ev) => setStartAt(ev.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.label}>
                    {tc.end}
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
                  {tc.notes}
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
                    {tc.cancel}
                  </button>
                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? tc.saving : tc.saveChanges}
                  </button>
                </div>
              </form>
            ) : (
              <form className={styles.form} onSubmit={createEvent}>
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>{tc.createTitle}</div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={closeModal}
                    aria-label={tc.close}
                  >
                    ✕
                  </button>
                </div>

                <label className={styles.label}>
                  {tc.child}
                  <select
                    className={styles.select}
                    value={childId}
                    onChange={(ev) => setChildId(ev.target.value)}
                    disabled={saving}
                  >
                    <option value="">{tc.selectChild}</option>
                    {children.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        {c.fullName} {c.status ? `(${c.status})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    {tc.eventType}
                    <select
                      className={styles.select}
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventType)}
                      disabled={saving}
                    >
                      <option value="pickup">{tc.eventTypePickup}</option>
                      <option value="dropoff">{tc.eventTypeDropoff}</option>
                      <option value="school">{tc.eventTypeSchool}</option>
                      <option value="activity">{tc.eventTypeActivity}</option>
                      <option value="medical">{tc.eventTypeMedical}</option>
                      <option value="other">{tc.eventTypeOther}</option>
                    </select>
                  </label>

                  <label className={styles.label}>
                    {tc.priority}
                    <select
                      className={styles.select}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as EventPriority)}
                      disabled={saving}
                    >
                      <option value="normal">{tc.priorityNormal}</option>
                      <option value="important">{tc.priorityImportant}</option>
                      <option value="urgent">{tc.priorityUrgent}</option>
                    </select>
                  </label>
                </div>

                <label className={styles.label}>
                  {tc.titleLabel}
                  <input
                    className={styles.input}
                    value={title}
                    onChange={(ev) => setTitle(ev.target.value)}
                    disabled={saving}
                    placeholder={tc.placeholderTitle}
                  />
                </label>

                <label className={styles.label}>
                  {tc.locationLabel}
                  <input
                    className={styles.input}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={saving}
                    placeholder={tc.placeholderLocation}
                  />
                </label>

                <label className={styles.label}>
                  {tc.responsibleParent}
                  <select
                    className={styles.select}
                    value={responsibleParent}
                    onChange={(e) => setResponsibleParent(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">{tc.selectParent}</option>
                    {parents.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </label>

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
                  {tc.requiresConfirmation}
                </label>

                {requiresConfirmation ? (
                  <label className={styles.label}>
                    {tc.confirmationStatus}
                    <select
                      className={styles.select}
                      value={confirmationStatus}
                      onChange={(e) =>
                        setConfirmationStatus(e.target.value as ConfirmationStatus)
                      }
                      disabled={saving}
                    >
                      <option value="pending">{tc.confirmationPending}</option>
                      <option value="confirmed">{tc.confirmationConfirmed}</option>
                      <option value="declined">{tc.confirmationDeclined}</option>
                    </select>
                  </label>
                ) : null}

                <div className={styles.formRow}>
                  <label className={styles.label}>
                    {tc.start}
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={startAt}
                      onChange={(ev) => setStartAt(ev.target.value)}
                      disabled={saving}
                    />
                  </label>

                  <label className={styles.label}>
                    {tc.end}
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
                  {tc.notes}
                  <textarea
                    className={styles.textarea}
                    value={notes}
                    onChange={(ev) => setNotes(ev.target.value)}
                    disabled={saving}
                    placeholder={tc.placeholderNotes}
                  />
                </label>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={closeModal}
                    disabled={saving}
                  >
                    {tc.cancel}
                  </button>
                  <button className={styles.primaryBtn} type="submit" disabled={saving}>
                    {saving ? tc.saving : tc.create}
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