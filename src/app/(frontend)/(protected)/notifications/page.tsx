'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCheck, ChevronRight } from 'lucide-react'
import styles from './notificationsPage.module.css'
import { useSettings } from '@/app/(frontend)/components/providers/SettingsProvider'

type Lang = 'no' | 'en'

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
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'connected'
  | 'disconnected'
  | 'transferred'

type NotificationItem = {
  id: string | number
  title?: string
  message?: string
  createdAt?: string
  link?: string
  readAt?: string | null
  isRead?: boolean
  type?: 'calendar' | 'expense' | 'request' | 'bank' | 'status' | 'documents' | 'post'
  event?: NotificationEventType
  meta?: Record<string, any>
}

const text = {
  no: {
    title: 'Alle varsler',
    subtitle:
      'Full oversikt over oppdateringer for barn, innlegg, kalender, dokumenter og økonomi.',
    total: 'Totalt',
    unread: 'Ulest',
    all: 'Alle',
    unreadTab: 'Ulest',
    loading: 'Laster varsler...',
    empty: 'Ingen varsler ennå.',
    couldNotLoad: 'Kunne ikke laste varsler.',
    markAllRead: 'Merk alle lest',
    saving: 'Lagrer...',
    back: 'Tilbake til dashboard',
    general: 'Generelt',
    calendar: 'Kalender',
    custody: 'Omsorg',
    expense: 'Økonomi',
    request: 'Forespørsel',
    bank: 'Bank',
    status: 'Status',
    documents: 'Dokumenter',
    post: 'Oppdateringer',
    child: 'Barn',
    from: 'Fra',
    to: 'Til',
    pickup: 'Henting',
    lastsUntil: 'Varer til',
    reason: 'Begrunnelse',
    close: 'Lukk',
    reject: 'Avslå',
    approve: 'Godta',
    sending: 'Sender...',
    emergencyRequested: 'Hastebytte forespurt',
    emergencyApproved: 'Hastebytte godkjent',
    emergencyRejected: 'Hastebytte avslått',
    aParent: 'En forelder',
    noReason: 'Ingen begrunnelse oppgitt.',
    missingRecipient: 'Mangler mottaker for svar på hastebytte.',
    missingCurrentUser: 'Mangler innlogget bruker.',
    couldNotGetMe: 'Kunne ikke hente innlogget bruker.',
    couldNotRespond: 'Kunne ikke svare på forespørselen.',
    custodyCreated: 'Omsorgsperiode opprettet',
    custodyUpdated: 'Omsorgsperiode oppdatert',
    custodyDeleted: 'Omsorgsperiode slettet',
    custodyReady: 'Klar for bytte',
    custodyHandedOver: 'Barnet er overlevert',
    createdCustody: 'opprettet en omsorgsperiode',
    updatedCustody: 'oppdaterte omsorgsplanen',
    deletedCustody: 'slettet en omsorgsperiode',
    markedReady: 'markerte omsorgsperioden som klar for bytte',
    confirmedHandover: 'bekreftet at barnet er overlevert',
    calendarCreated: 'opprettet',
    calendarUpdated: 'oppdatert',
    calendarDeleted: 'slettet',
    calendarAccepted: 'godtatt',
    calendarDeclined: 'avslått',
    eventTypes: {
      custody: 'Omsorgsperiode',
      handover: 'Omsorgsbytte',
      pickup: 'Henting',
      dropoff: 'Levering',
      school: 'Skole',
      activity: 'Aktivitet',
      medical: 'Medisinsk',
      payment: 'Betaling',
      other: 'Kalender',
    },
  },

  en: {
    title: 'All notifications',
    subtitle:
      'A full overview of updates across child profiles, posts, calendar, documents, and expenses.',
    total: 'Total',
    unread: 'Unread',
    all: 'All',
    unreadTab: 'Unread',
    loading: 'Loading notifications...',
    empty: 'No notifications yet.',
    couldNotLoad: 'Could not load notifications.',
    markAllRead: 'Mark all read',
    saving: 'Saving...',
    back: 'Back to dashboard',
    general: 'General',
    calendar: 'Calendar',
    custody: 'Custody',
    expense: 'Expense',
    request: 'Request',
    bank: 'Bank',
    status: 'Status',
    documents: 'Documents',
    post: 'Updates',
    child: 'Child',
    from: 'From',
    to: 'To',
    pickup: 'Pickup',
    lastsUntil: 'Lasts until',
    reason: 'Reason',
    close: 'Close',
    reject: 'Reject',
    approve: 'Approve',
    sending: 'Sending...',
    emergencyRequested: 'Emergency custody change requested',
    emergencyApproved: 'Emergency change approved',
    emergencyRejected: 'Emergency change rejected',
    aParent: 'A parent',
    noReason: 'No reason provided.',
    missingRecipient: 'Missing recipient for emergency response.',
    missingCurrentUser: 'Missing current user.',
    couldNotGetMe: 'Could not load current user.',
    couldNotRespond: 'Could not respond to the request.',
    custodyCreated: 'Custody period created',
    custodyUpdated: 'Custody period updated',
    custodyDeleted: 'Custody period deleted',
    custodyReady: 'Ready for handover',
    custodyHandedOver: 'Child handed over',
    createdCustody: 'created a custody period',
    updatedCustody: 'updated the custody plan',
    deletedCustody: 'deleted a custody period',
    markedReady: 'marked the custody period as ready for handover',
    confirmedHandover: 'confirmed that the child was handed over',
    calendarCreated: 'created',
    calendarUpdated: 'updated',
    calendarDeleted: 'deleted',
    calendarAccepted: 'accepted',
    calendarDeclined: 'declined',
    eventTypes: {
      custody: 'Custody period',
      handover: 'Handover',
      pickup: 'Pickup',
      dropoff: 'Drop-off',
      school: 'School',
      activity: 'Activity',
      medical: 'Medical',
      payment: 'Payment',
      other: 'Calendar',
    },
  },
}

function getMediaUrl(value: any) {
  if (!value) return ''

  if (typeof value === 'string') {
    if (value.startsWith('http') || value.startsWith('/api/')) return value
    return ''
  }

  return (
    value?.url ||
    value?.sizes?.thumbnail?.url ||
    value?.sizes?.card?.url ||
    value?.sizes?.small?.url ||
    ''
  )
}

function formatDateTime(value: string | undefined, lang: Lang) {
  if (!value) return '—'

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'

  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function shorten(text?: string, max = 80) {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function getInitials(name?: string) {
  const value = String(name || '').trim()
  if (!value) return 'N'

  const parts = value.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()

  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
}

function getAvatarUrl(item: NotificationItem) {
  const meta = item.meta || {}

  return getMediaUrl(
    meta.actorAvatarUrl ||
      meta.actorAvatar ||
      meta.actor?.avatar ||
      meta.actor?.profileImage ||
      meta.author?.avatar ||
      meta.author?.profileImage ||
      meta.user?.avatar ||
      meta.user?.profileImage ||
      meta.customer?.avatar ||
      meta.customer?.profileImage ||
      meta.avatarUrl ||
      meta.profileImageUrl ||
      meta.imageUrl,
  )
}

function getActorName(item: NotificationItem, lang: Lang) {
  const meta = item.meta || {}

  const directName =
    meta.actorName ||
    meta.actor?.fullName ||
    meta.author?.fullName ||
    meta.user?.fullName ||
    meta.customer?.fullName

  if (directName) return String(directName).trim()

  return String(item.title || text[lang].aParent).trim()
}

function getEventTypeLabel(type: string | undefined, lang: Lang) {
  const t = text[lang]
  const key = String(type || 'other') as keyof typeof t.eventTypes
  return t.eventTypes[key] || t.eventTypes.other
}

function isCustodyNotification(item: NotificationItem) {
  return item.type === 'calendar' && item.meta?.type === 'custody-schedule'
}

function getTypeLabel(item: NotificationItem, lang: Lang) {
  const t = text[lang]

  if (isCustodyNotification(item)) return t.custody

  switch (item.type) {
    case 'calendar':
      return t.calendar
    case 'expense':
      return t.expense
    case 'request':
      return t.request
    case 'bank':
      return t.bank
    case 'status':
      return t.status
    case 'documents':
      return t.documents
    case 'post':
      return t.post
    default:
      return t.general
  }
}

function buildNotificationTitle(item: NotificationItem, lang: Lang) {
  const t = text[lang]
  const meta = item.meta || {}
  const childName = String(meta.childName || '').trim()
  const documentName = String(meta.documentName || item.title || '').trim()
  const rawTitle = String(item.title || t.general).trim()
  const isChildUpdate = !!meta.isChildUpdate

  if (isCustodyNotification(item)) {
    if (item.event === 'created') {
      return `${t.custodyCreated}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'deleted') {
      return `${t.custodyDeleted}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'updated') {
      if (meta.handoverStatus === 'ready') {
        return `${t.custodyReady}${childName ? ` for ${childName}` : ''}`
      }

      if (meta.handoverStatus === 'handed-over') {
        return `${t.custodyHandedOver}${childName ? `: ${childName}` : ''}`
      }

      return `${t.custodyUpdated}${childName ? ` for ${childName}` : ''}`
    }
  }

  if (item.type === 'calendar' && meta.type === 'custody-emergency') {
    return `${meta.actorName || t.aParent} ${lang === 'en' ? 'requested emergency change' : 'ber om hastebytte'}${
      childName ? ` for ${childName}` : ''
    }`
  }

  if (item.type === 'calendar' && meta.type === 'custody-emergency-response') {
    return meta.status === 'approved'
      ? `${t.emergencyApproved}${childName ? ` for ${childName}` : ''}`
      : `${t.emergencyRejected}${childName ? ` for ${childName}` : ''}`
  }

  if (item.type === 'calendar') {
    const eventType = getEventTypeLabel(meta.eventType, lang)

    if (item.event === 'created') return `${eventType} ${t.calendarCreated}${childName ? ` for ${childName}` : ''}`
    if (item.event === 'updated') return `${eventType} ${t.calendarUpdated}${childName ? ` for ${childName}` : ''}`
    if (item.event === 'deleted') return `${eventType} ${t.calendarDeleted}${childName ? ` for ${childName}` : ''}`
    if (item.event === 'confirmed') return `${eventType} ${t.calendarAccepted}${childName ? ` for ${childName}` : ''}`
    if (item.event === 'declined') return `${eventType} ${t.calendarDeclined}${childName ? ` for ${childName}` : ''}`
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return childName
        ? lang === 'en'
          ? `Document uploaded for ${childName}`
          : `Dokument lastet opp for ${childName}`
        : documentName
          ? lang === 'en'
            ? `Document uploaded: ${documentName}`
            : `Dokument lastet opp: ${documentName}`
          : lang === 'en'
            ? 'Document uploaded'
            : 'Dokument lastet opp'
    }

    if (item.event === 'deleted') {
      return childName
        ? lang === 'en'
          ? `Document deleted for ${childName}`
          : `Dokument slettet for ${childName}`
        : documentName
          ? lang === 'en'
            ? `Document deleted: ${documentName}`
            : `Dokument slettet: ${documentName}`
          : lang === 'en'
            ? 'Document deleted'
            : 'Dokument slettet'
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return isChildUpdate
        ? lang === 'en'
          ? `New update${childName ? ` for ${childName}` : ''}`
          : `Ny oppdatering${childName ? ` for ${childName}` : ''}`
        : lang === 'en'
          ? 'New family update'
          : 'Ny familieoppdatering'
    }

    if (item.event === 'deleted') {
      return isChildUpdate
        ? lang === 'en'
          ? `Update deleted${childName ? ` for ${childName}` : ''}`
          : `Oppdatering slettet${childName ? ` for ${childName}` : ''}`
        : lang === 'en'
          ? 'Family update deleted'
          : 'Familieoppdatering slettet'
    }
  }

  return rawTitle
}

function buildNotificationMessage(item: NotificationItem, lang: Lang) {
  const t = text[lang]
  const meta = item.meta || {}
  const actorName = String(meta.actorName || t.aParent).trim()
  const childName = String(meta.childName || '').trim()
  const documentName = shorten(meta.documentName || item.title || '')
  const postTitle = shorten(meta.title || item.message || '')
  const confirmedAt = String(meta.confirmedAt || '').trim()

  if (isCustodyNotification(item)) {
    const action =
      meta.handoverStatus === 'ready'
        ? t.markedReady
        : meta.handoverStatus === 'handed-over'
          ? t.confirmedHandover
          : item.event === 'created'
            ? t.createdCustody
            : item.event === 'deleted'
              ? t.deletedCustody
              : t.updatedCustody

    return [
      `${actorName} ${action}`,
      childName ? `${t.child}: ${childName}` : '',
      meta.currentParentName && meta.nextParentName
        ? `${meta.currentParentName} → ${meta.nextParentName}`
        : '',
      meta.startAt ? `${t.from} ${formatDateTime(meta.startAt, lang)}` : '',
      meta.endAt ? `${t.to} ${formatDateTime(meta.endAt, lang)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'calendar' && meta.type === 'custody-emergency') {
    return [
      meta.pickupAt ? `${t.pickup}: ${formatDateTime(meta.pickupAt, lang)}` : '',
      meta.returnAt ? `${t.lastsUntil}: ${formatDateTime(meta.returnAt, lang)}` : '',
      item.message || meta.reason || t.emergencyRequested,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'calendar' && meta.type === 'custody-emergency-response') {
    return [
      meta.status === 'approved' ? t.emergencyApproved : t.emergencyRejected,
      meta.pickupAt ? `${t.pickup}: ${formatDateTime(meta.pickupAt, lang)}` : '',
      meta.returnAt ? `${t.lastsUntil}: ${formatDateTime(meta.returnAt, lang)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'calendar') {
    if (item.event === 'confirmed') {
      return `${actorName} ${lang === 'en' ? 'accepted the event' : 'godtok hendelsen'}${
        confirmedAt ? ` ${confirmedAt}` : ''
      }.`
    }

    if (item.event === 'declined') {
      return `${actorName} ${lang === 'en' ? 'declined the event' : 'avslo hendelsen'}${
        confirmedAt ? ` ${confirmedAt}` : ''
      }.`
    }

    if (item.event === 'updated') {
      return `${actorName} ${lang === 'en' ? 'updated a calendar event' : 'oppdaterte en kalenderhendelse'}${
        childName ? ` for ${childName}` : ''
      }.`
    }
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return lang === 'en'
        ? `${actorName} uploaded${documentName ? ` "${documentName}"` : ' a document'}.`
        : `${actorName} lastet opp${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }

    if (item.event === 'deleted') {
      return lang === 'en'
        ? `${actorName} deleted${documentName ? ` "${documentName}"` : ' a document'}.`
        : `${actorName} slettet${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return childName
        ? lang === 'en'
          ? `${actorName} published "${postTitle}" for ${childName}.`
          : `${actorName} publiserte "${postTitle}" for ${childName}.`
        : lang === 'en'
          ? `${actorName} published "${postTitle}".`
          : `${actorName} publiserte "${postTitle}".`
    }

    if (item.event === 'deleted') {
      return childName
        ? lang === 'en'
          ? `${actorName} deleted "${postTitle}" for ${childName}.`
          : `${actorName} slettet "${postTitle}" for ${childName}.`
        : lang === 'en'
          ? `${actorName} deleted "${postTitle}".`
          : `${actorName} slettet "${postTitle}".`
    }
  }

  return item.message || (lang === 'en' ? 'Open to view details.' : 'Åpne for å se detaljer.')
}

function NotificationTypeIcon({ type }: { type?: NotificationItem['type'] }) {
  const common = {
    className: styles.typeIcon,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  }

  switch (type) {
    case 'expense':
      return (
        <svg {...common}>
          <path d="M3 7h18v10H3V7z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )

    case 'request':
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )

    case 'bank':
      return (
        <svg {...common}>
          <path
            d="M4 10h16M6 10V7h12v3M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'documents':
      return (
        <svg {...common}>
          <path
            d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )

    case 'post':
      return (
        <svg {...common}>
          <path
            d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-11z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )

    default:
      return (
        <svg {...common}>
          <path
            d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
  }
}

export default function NotificationsPage() {
  const { settings } = useSettings()
  const lang: Lang = settings?.language === 'en' ? 'en' : 'no'
  const t = text[lang]

  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [selectedEmergency, setSelectedEmergency] = useState<NotificationItem | null>(null)
  const [actionLoading, setActionLoading] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  async function loadNotifications() {
    try {
      setLoading(true)
      setError('')

      const res = await fetch('/api/notifications/me', {
        credentials: 'include',
        cache: 'no-store',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || t.couldNotLoad)
      }

      setItems(Array.isArray(json?.docs) ? json.docs : [])
    } catch (err: any) {
      setError(err?.message || t.couldNotLoad)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function markOneAsRead(id: string | number) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })

      setItems((prev) =>
        prev.map((item) =>
          String(item.id) === String(id)
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      )
    } catch {}
  }

  async function markAllAsRead() {
    try {
      setMarkingAll(true)

      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) return

      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        })),
      )
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (!item.isRead && !item.readAt) {
      await markOneAsRead(item.id)
    }

    if (item.meta?.type === 'custody-emergency') {
      setSelectedEmergency(item)
      return
    }

    if (item.link) {
      window.location.href = item.link
    }
  }

  async function respondEmergencyRequest(nextStatus: 'approved' | 'rejected') {
    if (!selectedEmergency) return

    try {
      setError('')
      setActionLoading(nextStatus)

      const meta = selectedEmergency.meta || {}
      const recipientId = meta.actorId

      if (!recipientId) throw new Error(t.missingRecipient)

      const meRes = await fetch('/api/customers/me', {
        credentials: 'include',
        cache: 'no-store',
      })

      const meJson = await meRes.json().catch(() => null)

      if (!meRes.ok) throw new Error(meJson?.message || t.couldNotGetMe)

      const meUser = meJson?.user || meJson
      const meId = meUser?.id

      if (!meId) throw new Error(t.missingCurrentUser)

      const meName =
        meUser?.fullName ||
        `${meUser?.firstName || ''} ${meUser?.lastName || ''}`.trim() ||
        meUser?.email ||
        t.aParent

      const meAvatarUrl =
        getMediaUrl(meUser?.avatar) ||
        getMediaUrl(meUser?.profileImage) ||
        getMediaUrl(meUser?.image)

      if (nextStatus === 'approved') {
        const pickupDate = new Date(meta.pickupAt)
        const returnDate = new Date(meta.returnAt)

        const updateOldRes = await fetch(`/api/custody-schedules/${meta.custodyId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endAt: pickupDate.toISOString(),
          }),
        })

        if (!updateOldRes.ok) {
          const raw = await updateOldRes.text()
          throw new Error(raw || t.couldNotRespond)
        }

        const createNewRes = await fetch('/api/custody-schedules', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child: Number(meta.childId),
            currentParent: Number(meId),
            nextParent: Number(recipientId),
            startAt: pickupDate.toISOString(),
            endAt: returnDate.toISOString(),
            notes:
              lang === 'en'
                ? `Emergency change approved.${meta.reason ? ` Reason: ${meta.reason}` : ''}`
                : `Hastebytte godkjent.${meta.reason ? ` Begrunnelse: ${meta.reason}` : ''}`,
          }),
        })

        if (!createNewRes.ok) {
          const raw = await createNewRes.text()
          throw new Error(raw || t.couldNotRespond)
        }
      }

      await fetch(`/api/notifications/${selectedEmergency.id}/read`, {
        method: 'POST',
        credentials: 'include',
      })

      const res = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: Number(recipientId),
          title: nextStatus === 'approved' ? t.emergencyApproved : t.emergencyRejected,
          message: nextStatus === 'approved' ? t.emergencyApproved : t.emergencyRejected,
          type: 'calendar',
          event: nextStatus === 'approved' ? 'approved' : 'rejected',
          link: '/notifications',
          meta: {
            type: 'custody-emergency-response',
            custodyId: meta.custodyId,
            childId: meta.childId,
            actorId: meId,
            actorName: meName,
            actorAvatarUrl: meAvatarUrl,
            childName: meta.childName,
            reason: meta.reason,
            pickupAt: meta.pickupAt,
            returnAt: meta.returnAt,
            status: nextStatus,
          },
        }),
      })

      if (!res.ok) {
        const raw = await res.text()
        throw new Error(raw || t.couldNotRespond)
      }

      setSelectedEmergency(null)
      await loadNotifications()

      if (nextStatus === 'approved') {
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err?.message || t.couldNotRespond)
    } finally {
      setActionLoading('')
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [lang])

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead && !item.readAt).length,
    [items],
  )

  const visibleItems = useMemo(() => {
    if (activeTab === 'unread') {
      return items.filter((item) => !item.isRead && !item.readAt)
    }

    return items
  }, [activeTab, items])

  const actorAvatarMap = useMemo(() => {
    const map = new Map<string, string>()

    items.forEach((item) => {
      const actorName = getActorName(item, lang).toLowerCase()
      const avatarUrl = getAvatarUrl(item)

      if (actorName && avatarUrl && !map.has(actorName)) {
        map.set(actorName, avatarUrl)
      }
    })

    return map
  }, [items, lang])

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </div>

        <button
          type="button"
          className={styles.markAllBtn}
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck size={16} />
          {markingAll ? t.saving : t.markAllRead}
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t.total}</div>
          <div className={styles.summaryValue}>{items.length}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t.unread}</div>
          <div className={styles.summaryValue}>{unreadCount}</div>
        </div>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            {t.all}
          </button>

          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'unread' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            {t.unreadTab}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.state}>{t.loading}</div>
      ) : error ? (
        <div className={styles.stateError}>{error}</div>
      ) : visibleItems.length === 0 ? (
        <div className={styles.state}>{t.empty}</div>
      ) : (
        <div className={styles.list}>
          {visibleItems.map((item) => {
            const actorName = getActorName(item, lang)
            const avatarUrl = getAvatarUrl(item) || actorAvatarMap.get(actorName.toLowerCase()) || ''
            const fallbackInitials = getInitials(actorName)
            const isUnread = !item.isRead && !item.readAt

            return (
              <button
                key={String(item.id)}
                type="button"
                className={`${styles.item} ${isUnread ? styles.unread : styles.read}`}
                onClick={() => handleItemClick(item)}
              >
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>
                    {avatarUrl ? (
                      <img className={styles.avatarImg} src={avatarUrl} alt={actorName} />
                    ) : (
                      fallbackInitials
                    )}
                  </div>

                  <div className={styles.smallTypeIcon}>
                    <NotificationTypeIcon type={item.type || 'calendar'} />
                  </div>
                </div>

                <div className={styles.content}>
                  <div className={styles.itemTop}>
                    <div>
                      <div className={styles.itemTitle}>{buildNotificationTitle(item, lang)}</div>
                      <div className={styles.itemMessage}>{buildNotificationMessage(item, lang)}</div>
                    </div>

                    {isUnread ? <span className={styles.dot} /> : null}
                  </div>

                  <div className={styles.meta}>
                    <span>{getTypeLabel(item, lang)}</span>
                    <span>•</span>
                    <span>{formatDateTime(item.createdAt, lang)}</span>
                  </div>
                </div>

                <ChevronRight size={18} className={styles.arrow} />
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.backRow}>
        <Link href="/dashboard" className={styles.backLink}>
          {t.back}
        </Link>
      </div>

      {selectedEmergency ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setSelectedEmergency(null)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t.emergencyRequested}</h3>
            </div>

            <div className={styles.modalBody}>
              <p>
                <strong>{selectedEmergency.meta?.actorName || t.aParent}</strong>{' '}
                {lang === 'en' ? 'requested emergency custody change' : 'ber om hastebytte'}
                {selectedEmergency.meta?.childName ? ` for ${selectedEmergency.meta.childName}` : ''}.
              </p>

              {selectedEmergency.meta?.pickupAt ? (
                <p>
                  <strong>{t.pickup}:</strong>{' '}
                  {formatDateTime(selectedEmergency.meta.pickupAt, lang)}
                </p>
              ) : null}

              {selectedEmergency.meta?.returnAt ? (
                <p>
                  <strong>{t.lastsUntil}:</strong>{' '}
                  {formatDateTime(selectedEmergency.meta.returnAt, lang)}
                </p>
              ) : null}

              <p>
                <strong>{t.reason}:</strong>{' '}
                {selectedEmergency.message || selectedEmergency.meta?.reason || t.noReason}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={() => setSelectedEmergency(null)} disabled={!!actionLoading}>
                {t.close}
              </button>

              <button type="button" onClick={() => respondEmergencyRequest('rejected')} disabled={!!actionLoading}>
                {actionLoading === 'rejected' ? t.sending : t.reject}
              </button>

              <button type="button" onClick={() => respondEmergencyRequest('approved')} disabled={!!actionLoading}>
                {actionLoading === 'approved' ? t.sending : t.approve}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}