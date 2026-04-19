'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  X,
  MapPin,
  UserRound,
  ArrowRightLeft,
  Loader2,
  Users,
  AlertTriangle,
} from 'lucide-react'
import styles from './dashboard.module.css'

type NotificationEventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'confirmed'
  | 'declined'
  | 'commented'
  | 'liked'
  | 'uploaded'
  | 'replaced'

type MeUser = {
  id: string | number
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
}

type ParentOption = {
  id: string | number
  fullName: string
  email?: string
}

type NotificationItem = {
  id: string | number
  title?: string
  message?: string
  createdAt?: string
  link?: string
  readAt?: string | null
  isRead?: boolean
  type?: 'calendar' | 'expense' | 'status' | 'documents' | 'post'
  event?: NotificationEventType
  meta?: Record<string, any>
}

type DashboardEvent = {
  id: string | number
  title: string
  startAt: string
  endAt: string
  eventType?: string
  priority?: string
  location?: string
  requiresConfirmation?: boolean
  confirmationStatus?: 'not-required' | 'pending' | 'confirmed' | 'declined'
  child?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  handoverFrom?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  handoverTo?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  responsibleParent?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  confirmedBy?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  confirmedAt?: string
  createdBy?: { id: string | number } | string | number | null
}

type ChildDashboardItem = {
  id: string | number
  fullName?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

type FamilyJoinPreview = {
  ok: boolean
  code: string
  alreadyMember: boolean
  isSameFamily: boolean
  willLeaveCurrentFamily: boolean
  warning?: string
  currentFamily?: {
    id: string | number
    name?: string
    inviteCode?: string
    memberCount?: number
  } | null
  targetFamily?: {
    id: string | number
    name?: string
    inviteCode?: string
    memberCount?: number
  } | null
}

type PendingActionItem = {
  id: string | number
  kind: 'child' | 'event'
  title: string
  subtitle: string
  detail: string
  href: string
  createdAt?: string
  startAt?: string
  confirmationStatus?: string
  eventType?: string
  location?: string
}

type DashboardData = {
  me: MeUser | null
  unreadNotifications: number
  notifications: NotificationItem[]
  childCount: number
  upcomingHandover: {
    id: string | number
    title: string
    startAt: string
    endAt: string
    location: string
    childName: string
    handoverFromName: string
    handoverToName: string
    responsibleParentName: string
    confirmationStatus: string
    confirmedByName: string
    confirmedAt?: string
  } | null
  pendingActions: PendingActionItem[]
  upcomingEvents: Array<{
    id: string | number
    title: string
    startAt: string
    endAt: string
    childName: string
    eventType: string
    location: string
    confirmationStatus: string
    requiresConfirmation: boolean
  }>
}

function getRelId(v: any) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return v?.id != null ? String(v.id) : ''
}

function getRelDisplayName(v: any, nameMap?: Map<string, string>) {
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

function getDisplayName(me: MeUser | null) {
  if (!me) return 'there'

  const full =
    `${String(me.firstName || '').trim()} ${String(me.lastName || '').trim()}`.trim() ||
    String(me.fullName || '').trim()

  return full || 'there'
}

function getEventTypeLabel(type?: string) {
  switch (String(type || 'other')) {
    case 'handover':
      return 'Handover'
    case 'pickup':
      return 'Pickup'
    case 'dropoff':
      return 'Drop-off'
    case 'school':
      return 'School'
    case 'activity':
      return 'Activity'
    case 'medical':
      return 'Medical'
    case 'payment':
      return 'Payment'
    default:
      return 'Other'
  }
}

function getStatusTone(status?: string, requiresConfirmation?: boolean) {
  if (!requiresConfirmation || status === 'not-required') {
    return {
      label: 'No confirmation needed',
      className: styles.statusNeutral,
    }
  }

  if (status === 'pending') {
    return {
      label: 'Needs confirmation',
      className: styles.statusPending,
    }
  }

  if (status === 'confirmed') {
    return {
      label: 'Confirmed',
      className: styles.statusConfirmed,
    }
  }

  return {
    label: 'Declined',
    className: styles.statusDeclined,
  }
}

function formatNotificationTime(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'dd.MM, HH:mm')
}

function shorten(text?: string, max = 80) {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function getCountdownParts(targetIso?: string) {
  if (!targetIso) return null

  const now = Date.now()
  const target = new Date(targetIso).getTime()
  const diff = target - now

  if (Number.isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }

  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  return { days, hours, minutes, expired: false }
}

function buildNotificationTitle(item: NotificationItem) {
  const meta = item.meta || {}
  const actorName = String(meta.actorName || 'A parent').trim()
  const childName = String(meta.childName || '').trim()
  const eventType = getEventTypeLabel(meta.eventType)
  const rawTitle = String(item.title || 'Notification').trim()
  const isChildUpdate = !!meta.isChildUpdate
  const documentName = String(meta.documentName || item.title || '').trim()

  if (item.type === 'calendar') {
    if (item.event === 'created') {
      return `${actorName} created ${eventType.toLowerCase()}${childName ? ` for ${childName}` : ''}`
    }

    if (
      item.event === 'updated' &&
      meta.requiresConfirmation &&
      meta.confirmationStatus === 'pending'
    ) {
      return `${actorName} updated ${eventType.toLowerCase()}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'updated') {
      return `${actorName} updated ${eventType.toLowerCase()}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'deleted') {
      return `${actorName} deleted ${eventType.toLowerCase()}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'confirmed') {
      return `${actorName} accepted ${eventType.toLowerCase()}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'declined') {
      return `${actorName} declined ${eventType.toLowerCase()}${childName ? ` for ${childName}` : ''}`
    }
  }

  if (item.type === 'status') {
    if (item.event === 'created' && childName) {
      return `New child profile: ${childName}`
    }

    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return `${childName} needs confirmation`
    }

    if (item.event === 'updated' && childName) {
      return `${childName} profile updated`
    }

    if (item.event === 'confirmed' && childName) {
      return `${childName} was confirmed`
    }

    if (item.event === 'declined' && childName) {
      return `${childName} was declined`
    }
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return childName
        ? `Document uploaded for ${childName}`
        : documentName
          ? `Document uploaded: ${documentName}`
          : 'Document uploaded'
    }

    if (item.event === 'replaced') {
      return childName
        ? `Document replaced for ${childName}`
        : documentName
          ? `Document replaced: ${documentName}`
          : 'Document replaced'
    }

    if (item.event === 'updated') {
      return childName
        ? `Document updated for ${childName}`
        : documentName
          ? `Document updated: ${documentName}`
          : 'Document updated'
    }

    if (item.event === 'deleted') {
      return childName
        ? `Document deleted for ${childName}`
        : documentName
          ? `Document deleted: ${documentName}`
          : 'Document deleted'
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return isChildUpdate
        ? `New update${childName ? ` for ${childName}` : ''}`
        : 'New family update'
    }

    if (item.event === 'updated') {
      return isChildUpdate
        ? `Update edited${childName ? ` for ${childName}` : ''}`
        : 'Family update edited'
    }

    if (item.event === 'deleted') {
      return isChildUpdate
        ? `Update deleted${childName ? ` for ${childName}` : ''}`
        : 'Family update deleted'
    }

    if (item.event === 'commented') {
      return childName ? `New comment for ${childName}` : 'New comment on update'
    }

    if (item.event === 'liked') {
      return childName ? `Update liked for ${childName}` : 'Update liked'
    }
  }

  return rawTitle || 'Notification'
}

function buildNotificationMessage(item: NotificationItem) {
  const meta = item.meta || {}
  const actorName = String(meta.actorName || 'A parent').trim()
  const childName = String(meta.childName || '').trim()
  const documentName = shorten(meta.documentName || item.title || '')
  const postTitle = shorten(meta.title || item.message || '')
  const confirmedAt = String(meta.confirmedAt || '').trim()

  if (item.type === 'calendar') {
    if (item.event === 'created') {
      const parts = [
        meta.startAt ? formatNotificationTime(meta.startAt) : '',
        meta.handoverFromName && meta.handoverToName
          ? `${meta.handoverFromName} → ${meta.handoverToName}`
          : '',
        meta.location || '',
      ].filter(Boolean)

      return parts.length
        ? `${actorName} created this event. ${parts.join(' · ')}`
        : `${actorName} created this event.`
    }

    if (item.event === 'confirmed') {
      return `${actorName} accepted this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    if (item.event === 'declined') {
      return `${actorName} declined this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    if (item.event === 'deleted') {
      const parts = [
        meta.startAt ? formatNotificationTime(meta.startAt) : '',
        meta.handoverFromName && meta.handoverToName
          ? `${meta.handoverFromName} → ${meta.handoverToName}`
          : '',
        meta.location || '',
      ].filter(Boolean)

      return parts.length
        ? `${actorName} deleted this event. ${parts.join(' · ')}`
        : `${actorName} deleted this event.`
    }

    if (
      item.event === 'updated' &&
      meta.requiresConfirmation &&
      meta.confirmationStatus === 'pending'
    ) {
      return `${actorName} updated this event. Waiting for second parent confirmation.`
    }

    if (item.event === 'updated') {
      const parts = [
        meta.startAt ? formatNotificationTime(meta.startAt) : '',
        meta.handoverFromName && meta.handoverToName
          ? `${meta.handoverFromName} → ${meta.handoverToName}`
          : '',
        meta.location || '',
      ].filter(Boolean)

      return parts.length
        ? `${actorName} updated this event. ${parts.join(' · ')}`
        : `${actorName} updated this event.`
    }
  }

  if (item.type === 'status') {
    if (item.event === 'created' && childName) {
      return `${actorName} created this child profile. Waiting for second parent confirmation.`
    }

    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return `${actorName} updated this child profile. Waiting for second parent confirmation.`
    }

    if (item.event === 'updated' && childName) {
      return `${actorName} updated this child profile.`
    }

    if (item.event === 'confirmed' && childName) {
      return `${actorName} confirmed this child profile.`
    }

    if (item.event === 'declined' && childName) {
      return `${actorName} declined this child profile.`
    }
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return `${actorName} uploaded${documentName ? ` "${documentName}"` : ' a document'}.`
    }

    if (item.event === 'replaced') {
      return `${actorName} replaced${documentName ? ` "${documentName}"` : ' a document'}.`
    }

    if (item.event === 'updated') {
      return `${actorName} updated${documentName ? ` "${documentName}"` : ' a document'}.`
    }

    if (item.event === 'deleted') {
      return `${actorName} deleted${documentName ? ` "${documentName}"` : ' a document'}.`
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return childName
        ? `${actorName} created the post "${postTitle}" for ${childName}.`
        : `${actorName} created the post "${postTitle}".`
    }

    if (item.event === 'updated') {
      return childName
        ? `${actorName} updated the post "${postTitle}" for ${childName}.`
        : `${actorName} updated the post "${postTitle}".`
    }

    if (item.event === 'deleted') {
      return childName
        ? `${actorName} deleted the post "${postTitle}" for ${childName}.`
        : `${actorName} deleted the post "${postTitle}".`
    }

    if (item.event === 'commented') {
      return `${actorName} commented on "${postTitle}".`
    }

    if (item.event === 'liked') {
      return `${actorName} liked "${postTitle}".`
    }
  }

  return item.message || 'Open to view details.'
}

export default function DashboardPage() {
  const router = useRouter()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [parents, setParents] = useState<ParentOption[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPreview, setJoinPreview] = useState<FamilyJoinPreview | null>(null)
  const [joinModalOpen, setJoinModalOpen] = useState(false)

  const parentNameById = useMemo(() => {
    const m = new Map<string, string>()
    parents.forEach((p) => {
      m.set(String(p.id), p.fullName || p.email || String(p.id))
    })
    return m
  }, [parents])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const [
        meRes,
        calendarRes,
        notificationsRes,
        childrenCountRes,
        pendingChildrenRes,
        parentsRes,
      ] = await Promise.all([
        fetch('/api/customers/me', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/calendar-events?limit=100&sort=startAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/notifications/me?limit=8&sort=-createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/children?limit=100', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/children?limit=20&sort=-updatedAt&where[status][equals]=pending&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/customers?limit=200&sort=createdAt&depth=0', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
      ])

      const meJson = await meRes.json().catch(() => null)
      const calendarJson = await calendarRes.json().catch(() => null)
      const notificationsJson = notificationsRes
        ? await notificationsRes.json().catch(() => null)
        : null
      const childrenCountJson = childrenCountRes
        ? await childrenCountRes.json().catch(() => null)
        : null
      const pendingChildrenJson = pendingChildrenRes
        ? await pendingChildrenRes.json().catch(() => null)
        : null
      const parentsJson = parentsRes ? await parentsRes.json().catch(() => null) : null

      if (!meRes.ok) {
        throw new Error(meJson?.message || `Could not load current user (${meRes.status})`)
      }

      if (!calendarRes.ok) {
        throw new Error(
          calendarJson?.message || `Could not load calendar events (${calendarRes.status})`,
        )
      }

      setParents(
        (parentsJson?.docs ?? []).map((p: any) => ({
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

      const docs: DashboardEvent[] = calendarJson?.docs ?? []
      const currentUserId = String(meJson?.user?.id || meJson?.id || '')
      const now = new Date()

      const upcoming = docs
        .filter((event) => new Date(event.endAt).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      const visibleUpcoming = upcoming.filter(
        (event) => event.confirmationStatus !== 'declined',
      )

      const confirmableUpcoming = visibleUpcoming.filter((event) => {
        return (
          event.requiresConfirmation === true &&
          event.confirmationStatus === 'pending' &&
          String((event.createdBy as any)?.id || event.createdBy || '') !== currentUserId
        )
      })

      const upcomingHandover =
        visibleUpcoming.find((event) => event.eventType === 'handover') ?? null

      const pendingEventActions: PendingActionItem[] = confirmableUpcoming.map((event) => ({
        id: event.id,
        kind: 'event' as const,
        title: event.title,
        subtitle: `${getRelDisplayName(event.child) || 'No child'} · ${getEventTypeLabel(
          event.eventType,
        )}`,
        detail: `${format(new Date(event.startAt), 'dd.MM.yyyy HH:mm')}${
          event.location ? ` · ${event.location}` : ''
        }`,
        href: `/calendar?event=${event.id}`,
        startAt: event.startAt,
        confirmationStatus: event.confirmationStatus || 'pending',
        eventType: event.eventType || 'other',
        location: event.location || '',
      }))

      const pendingChildDocs: ChildDashboardItem[] = pendingChildrenJson?.docs ?? []

      const pendingChildActions: PendingActionItem[] = pendingChildDocs.map((child) => ({
        id: child.id,
        kind: 'child' as const,
        title: child.fullName || 'Child profile',
        subtitle: 'Child profile · Pending confirmation',
        detail: child.updatedAt
          ? `Last updated ${format(new Date(child.updatedAt), 'dd.MM.yyyy HH:mm')}`
          : 'Needs second parent confirmation',
        href: `/child-info/${child.id}`,
        createdAt: child.createdAt,
        confirmationStatus: child.status || 'pending',
      }))

      const pendingActions = [...pendingChildActions, ...pendingEventActions]
      const upcomingEvents = visibleUpcoming.slice(0, 6)
      const notifications: NotificationItem[] = notificationsJson?.docs ?? []
      const unreadNotifications = notifications.filter((item) => !item.readAt && !item.isRead).length

      setData({
        me: meJson?.user ?? meJson ?? null,
        unreadNotifications,
        notifications,
        childCount:
          childrenCountJson?.totalDocs ??
          (Array.isArray(childrenCountJson?.docs) ? childrenCountJson.docs.length : 0),
        upcomingHandover: upcomingHandover
          ? {
              id: upcomingHandover.id,
              title: upcomingHandover.title,
              startAt: upcomingHandover.startAt,
              endAt: upcomingHandover.endAt,
              location: upcomingHandover.location || '',
              childName: getRelDisplayName(upcomingHandover.child),
              handoverFromName: getRelDisplayName(
                upcomingHandover.handoverFrom,
                parentNameById,
              ),
              handoverToName: getRelDisplayName(
                upcomingHandover.handoverTo,
                parentNameById,
              ),
              responsibleParentName: getRelDisplayName(
                upcomingHandover.responsibleParent,
                parentNameById,
              ),
              confirmationStatus: upcomingHandover.confirmationStatus || 'not-required',
              confirmedByName: getRelDisplayName(
                upcomingHandover.confirmedBy,
                parentNameById,
              ),
              confirmedAt: upcomingHandover.confirmedAt,
            }
          : null,
        pendingActions,
        upcomingEvents: upcomingEvents.map((event) => ({
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          childName: getRelDisplayName(event.child),
          eventType: event.eventType || 'other',
          location: event.location || '',
          confirmationStatus: event.confirmationStatus || 'not-required',
          requiresConfirmation: !!event.requiresConfirmation,
        })),
      })
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const greetingName = useMemo(() => getDisplayName(data?.me ?? null), [data?.me])
  const countdown = useMemo(
    () => getCountdownParts(data?.upcomingHandover?.startAt),
    [data?.upcomingHandover?.startAt],
  )

  async function markNotificationAsRead(id: string | number) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {}
  }

  async function handleNotificationClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NotificationItem,
  ) {
    e.preventDefault()

    const href = item.link || '/notifications'
    const wasUnread = !item.readAt && !item.isRead

    if (wasUnread) {
      setData((prev) => {
        if (!prev) return prev

        return {
          ...prev,
          unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
          notifications: prev.notifications.map((n) =>
            String(n.id) === String(item.id)
              ? {
                  ...n,
                  isRead: true,
                  readAt: new Date().toISOString(),
                }
              : n,
          ),
        }
      })
    }

    setNotifOpen(false)
    await markNotificationAsRead(item.id)
    router.push(href)
  }

  async function handleConfirmation(
    eventId: string | number,
    nextStatus: 'confirmed' | 'declined',
  ) {
    try {
      setActionLoading(`confirm-${eventId}-${nextStatus}`)

      const res = await fetch(`/api/calendar-events/${eventId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationStatus: nextStatus,
        }),
      })

      const raw = await res.text()
      let json: any = null

      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        throw new Error(
          json?.message ||
            json?.errors?.[0]?.message ||
            raw ||
            'Could not update confirmation.',
        )
      }

      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Could not update confirmation.')
    } finally {
      setActionLoading('')
    }
  }

  async function previewJoinFamily() {
    try {
      setError('')
      setActionLoading('join-preview')

      const code = joinCode.trim().toUpperCase()
      if (!code) {
        throw new Error('Please enter an invite code.')
      }

      const res = await fetch('/api/families/join/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const raw = await res.text()
      let json: any = null

      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        throw new Error(json?.message || raw || 'Could not preview family join.')
      }

      setJoinPreview(json)
      setJoinModalOpen(true)
    } catch (err: any) {
      setError(err?.message || 'Could not preview family join.')
    } finally {
      setActionLoading('')
    }
  }

  async function confirmJoinFamily() {
    try {
      setError('')
      setActionLoading('join-confirm')

      const code = joinCode.trim().toUpperCase()
      if (!code) {
        throw new Error('Please enter an invite code.')
      }

      const res = await fetch('/api/families/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          confirmJoin: true,
        }),
      })

      const raw = await res.text()
      let json: any = null

      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        throw new Error(json?.message || raw || 'Could not join family.')
      }

      setJoinModalOpen(false)
      setJoinPreview(null)
      setJoinCode('')
      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Could not join family.')
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <div className={styles.state}>Loading dashboard...</div>
  }

  if (error && !data) {
    return <div className={styles.stateError}>{error}</div>
  }

  if (!data) {
    return <div className={styles.state}>No data</div>
  }

  const handoverTone = getStatusTone(
    data.upcomingHandover?.confirmationStatus,
    data.upcomingHandover?.confirmationStatus !== 'not-required',
  )

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Good morning, {greetingName}</h1>
          <p className={styles.subtitle}>
            Here is your structured coordination overview for today.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.bellWrap}>
            <button
              type="button"
              className={styles.bellBtn}
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {data.unreadNotifications > 0 ? (
                <span className={styles.bellCount}>
                  {data.unreadNotifications > 9 ? '9+' : data.unreadNotifications}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>
                  <span className={styles.notifTitle}>Recent notifications</span>
                  <Link href="/notifications" className={styles.notifViewAll}>
                    View all
                  </Link>
                </div>

                {data.notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>No notifications yet.</div>
                ) : (
                  <div className={styles.notifList}>
                    {data.notifications.map((item) => (
                      <a
                        key={String(item.id)}
                        href={item.link || '/notifications'}
                        className={styles.notifItem}
                        onClick={(e) => handleNotificationClick(e, item)}
                      >
                        <div className={styles.notifItemTitle}>
                          {buildNotificationTitle(item)}
                        </div>
                        <div className={styles.notifItemMessage}>
                          {buildNotificationMessage(item)}
                        </div>
                        <div className={styles.notifItemTime}>
                          {formatNotificationTime(item.createdAt)}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <Link href="/calendar" className={styles.primaryBtn}>
            <Plus size={16} />
            Add event
          </Link>
        </div>
      </header>

      {error ? <div className={styles.inlineError}>{error}</div> : null}

      {data.childCount === 0 ? (
        <section className={styles.bannerCard}>
          <div className={styles.bannerIcon}>
            <Users size={20} />
          </div>

          <div className={styles.bannerBody}>
            <div className={styles.bannerTitle}>Your family has no child profile yet</div>
            <div className={styles.bannerText}>
              Create the first child profile so handovers, school details, emergency
              contacts, and child-related events can appear in the dashboard.
            </div>
          </div>

          <div className={styles.bannerActions}>
            <Link href="/child-info/new" className={styles.primaryBtn}>
              Create child profile
            </Link>
          </div>
        </section>
      ) : null}

      <section className={styles.joinCard}>
        <div className={styles.joinHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              <Users size={18} />
              <span>Join family</span>
            </h2>
            <p className={styles.joinText}>
              Enter an invite code to join another family workspace.
            </p>
          </div>
        </div>

        <div className={styles.joinForm}>
          <input
            className={styles.joinInput}
            type="text"
            placeholder="Enter invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={20}
          />

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={previewJoinFamily}
            disabled={!joinCode.trim() || actionLoading === 'join-preview'}
          >
            {actionLoading === 'join-preview' ? (
              <>
                <Loader2 size={16} className={styles.spin} />
                Checking...
              </>
            ) : (
              'Join family'
            )}
          </button>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.heroCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <ArrowRightLeft size={18} />
              <span>Upcoming handover</span>
            </h2>

            {data.upcomingHandover ? (
              <Link href={`/calendar?event=${data.upcomingHandover.id}`} className={styles.cardLink}>
                View details
              </Link>
            ) : null}
          </div>

          {data.upcomingHandover ? (
            <div className={styles.handoverBox}>
              <div className={styles.handoverMain}>
                <div className={styles.handoverTitle}>{data.upcomingHandover.title}</div>

                <div className={styles.handoverMeta}>
                  <span>
                    <UserRound size={14} />
                    Child: {data.upcomingHandover.childName || 'Not set'}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {format(new Date(data.upcomingHandover.startAt), 'dd.MM.yyyy HH:mm')}
                  </span>
                  <span>
                    <MapPin size={14} />
                    {data.upcomingHandover.location || 'No location'}
                  </span>
                </div>

                <div className={styles.handoverFlow}>
                  <div className={styles.flowBox}>
                    <div className={styles.flowLabel}>From</div>
                    <div className={styles.flowValue}>
                      {data.upcomingHandover.handoverFromName || 'Not set'}
                    </div>
                  </div>

                  <div className={styles.flowArrow}>→</div>

                  <div className={styles.flowBox}>
                    <div className={styles.flowLabel}>To</div>
                    <div className={styles.flowValue}>
                      {data.upcomingHandover.handoverToName || 'Not set'}
                    </div>
                  </div>
                </div>

                <div className={styles.handoverResponsible}>
                  Responsible: {data.upcomingHandover.responsibleParentName || 'Not assigned'}
                </div>

                <div className={styles.handoverResponsible}>
                  Status:{' '}
                  <span className={`${styles.statusBadge} ${handoverTone.className}`}>
                    {handoverTone.label}
                  </span>
                  {data.upcomingHandover.confirmationStatus !== 'pending' &&
                  data.upcomingHandover.confirmedByName
                    ? ` · by ${data.upcomingHandover.confirmedByName}`
                    : ''}
                </div>
              </div>

              <div className={styles.countdownCard}>
                <div className={styles.countdownLabel}>Next handover in</div>

                {countdown && !countdown.expired ? (
                  <div className={styles.countdownGrid}>
                    <div className={styles.countdownItem}>
                      <strong>{String(countdown.days).padStart(2, '0')}</strong>
                      <span>Days</span>
                    </div>
                    <div className={styles.countdownItem}>
                      <strong>{String(countdown.hours).padStart(2, '0')}</strong>
                      <span>Hours</span>
                    </div>
                    <div className={styles.countdownItem}>
                      <strong>{String(countdown.minutes).padStart(2, '0')}</strong>
                      <span>Mins</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.countdownExpired}>Starting soon</div>
                )}

                <div className={styles.heroActions}>
                  {data.upcomingHandover.confirmationStatus === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className={styles.approveBtn}
                        onClick={() =>
                          handleConfirmation(data.upcomingHandover!.id, 'confirmed')
                        }
                        disabled={
                          actionLoading ===
                          `confirm-${data.upcomingHandover.id}-confirmed`
                        }
                      >
                        {actionLoading ===
                        `confirm-${data.upcomingHandover.id}-confirmed` ? (
                          <>
                            <Loader2 size={16} className={styles.spin} />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            Accept
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className={styles.declineBtn}
                        onClick={() =>
                          handleConfirmation(data.upcomingHandover!.id, 'declined')
                        }
                        disabled={
                          actionLoading ===
                          `confirm-${data.upcomingHandover.id}-declined`
                        }
                      >
                        {actionLoading ===
                        `confirm-${data.upcomingHandover.id}-declined` ? (
                          <>
                            <Loader2 size={16} className={styles.spin} />
                            Saving...
                          </>
                        ) : (
                          <>
                            <X size={16} />
                            Decline
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <Link href={`/calendar?event=${data.upcomingHandover.id}`} className={styles.secondaryBtn}>
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>No upcoming handover</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Quick actions</h2>
          </div>

          <div className={styles.quickList}>
            <Link href="/calendar" className={styles.quickAction}>
              <CalendarDays size={16} />
              <span>Add calendar event</span>
              <ChevronRight size={16} />
            </Link>

            <Link href="/economy" className={styles.quickAction}>
              <span>💰</span>
              <span>Register expense</span>
              <ChevronRight size={16} />
            </Link>

            <Link href="/child-info" className={styles.quickAction}>
              <span>👶</span>
              <span>Open child profiles</span>
              <ChevronRight size={16} />
            </Link>

            <Link href="/profile" className={styles.quickAction}>
              <span>👤</span>
              <span>Open profile</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Pending actions</h2>
            <Link href="/calendar" className={styles.cardLink}>
              Full calendar
            </Link>
          </div>

          {data.pendingActions.length ? (
            <div className={styles.pendingList}>
              {data.pendingActions.map((item) => (
                <div key={`${item.kind}-${item.id}`} className={styles.pendingItem}>
                  <Link href={item.href} className={styles.pendingBody}>
                    <div className={styles.pendingTitle}>{item.title}</div>
                    <div className={styles.pendingMeta}>{item.subtitle}</div>
                    <div className={styles.pendingMeta}>{item.detail}</div>
                  </Link>

                  <div className={styles.pendingButtons}>
                    {item.kind === 'event' ? (
                      <>
                        <button
                          type="button"
                          className={styles.smallApproveBtn}
                          onClick={() => handleConfirmation(item.id, 'confirmed')}
                          disabled={actionLoading === `confirm-${item.id}-confirmed`}
                        >
                          {actionLoading === `confirm-${item.id}-confirmed` ? (
                            <Loader2 size={14} className={styles.spin} />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>

                        <button
                          type="button"
                          className={styles.smallDeclineBtn}
                          onClick={() => handleConfirmation(item.id, 'declined')}
                          disabled={actionLoading === `confirm-${item.id}-declined`}
                        >
                          {actionLoading === `confirm-${item.id}-declined` ? (
                            <Loader2 size={14} className={styles.spin} />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      </>
                    ) : (
                      <Link href={item.href} className={styles.secondaryBtn}>
                        Review
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>No pending actions</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Upcoming events</h2>
            <Link href="/calendar" className={styles.cardLink}>
              View all
            </Link>
          </div>

          {data.upcomingEvents.length ? (
            <div className={styles.eventList}>
              {data.upcomingEvents.map((item) => {
                const tone = getStatusTone(item.confirmationStatus, item.requiresConfirmation)

                return (
                  <Link key={String(item.id)} href={`/calendar?event=${item.id}`} className={styles.eventRow}>
                    <div className={styles.eventTime}>
                      {format(new Date(item.startAt), 'HH:mm')}
                    </div>

                    <div className={styles.eventBody}>
                      <div className={styles.eventTitle}>{item.title}</div>
                      <div className={styles.eventMeta}>
                        {item.childName || 'No child'} · {getEventTypeLabel(item.eventType)}
                      </div>
                      <div className={styles.eventMeta}>
                        {format(new Date(item.startAt), 'dd.MM.yyyy HH:mm')}
                        {item.location ? ` · ${item.location}` : ''}
                      </div>
                      <div className={styles.eventMeta}>
                        <span className={`${styles.statusBadge} ${tone.className}`}>
                          {tone.label}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={18} className={styles.eventArrow} />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className={styles.empty}>No upcoming events</div>
          )}
        </section>
      </div>

      {joinModalOpen && joinPreview ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setJoinModalOpen(false)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <AlertTriangle size={18} />
                <h3 className={styles.modalTitle}>Join family</h3>
              </div>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                You are about to join{' '}
                <strong>{joinPreview.targetFamily?.name || 'this family'}</strong>.
              </p>

              {joinPreview.isSameFamily ? (
                <div className={styles.modalInfo}>You are already in this family.</div>
              ) : null}

              {joinPreview.willLeaveCurrentFamily ? (
                <div className={styles.modalWarning}>
                  <div className={styles.modalWarningTitle}>Warning</div>
                  <div className={styles.modalWarningText}>
                    If you continue, you will leave{' '}
                    <strong>{joinPreview.currentFamily?.name || 'your current family'}</strong>{' '}
                    and may lose access to its shared children, calendar events,
                    notifications, handovers, and economy data.
                  </div>
                </div>
              ) : null}

              <div className={styles.familyCompare}>
                <div className={styles.familyCompareCard}>
                  <div className={styles.familyCompareLabel}>Current family</div>
                  <div className={styles.familyCompareValue}>
                    {joinPreview.currentFamily?.name || 'No current family'}
                  </div>
                  <div className={styles.familyCompareMeta}>
                    {joinPreview.currentFamily?.memberCount ?? 0} members
                  </div>
                </div>

                <div className={styles.familyCompareArrow}>→</div>

                <div className={styles.familyCompareCard}>
                  <div className={styles.familyCompareLabel}>Target family</div>
                  <div className={styles.familyCompareValue}>
                    {joinPreview.targetFamily?.name || 'Unknown family'}
                  </div>
                  <div className={styles.familyCompareMeta}>
                    {joinPreview.targetFamily?.memberCount ?? 0} members
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setJoinModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={confirmJoinFamily}
                disabled={
                  joinPreview.isSameFamily ||
                  joinPreview.alreadyMember ||
                  actionLoading === 'join-confirm'
                }
              >
                {actionLoading === 'join-confirm' ? (
                  <>
                    <Loader2 size={16} className={styles.spin} />
                    Joining...
                  </>
                ) : (
                  'Confirm join'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}