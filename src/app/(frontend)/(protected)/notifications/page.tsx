'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCheck, ChevronRight } from 'lucide-react'
import styles from './notificationsPage.module.css'
import { useSettings } from '@/app/(frontend)/components/providers/SettingsProvider'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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

function isCustodyNotification(item: NotificationItem) {
  const meta = item.meta || {}

  return (
    item.type === 'calendar' &&
    (meta.type === 'custody-schedule' ||
      meta.eventType === 'custody' ||
      meta.custodyId ||
      String(item.title || '').toLowerCase().includes('custody period') ||
      String(item.title || '').toLowerCase().includes('omsorgsperiode'))
  )
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
  const dict = useTranslations()

  const lang: Lang = settings?.language === 'en' ? 'en' : 'no'
  const t = dict.notifications as any

  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [selectedEmergency, setSelectedEmergency] = useState<NotificationItem | null>(null)
  const [actionLoading, setActionLoading] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  function getActorName(item: NotificationItem) {
    const meta = item.meta || {}

    const directName =
      meta.actorName ||
      meta.actor?.fullName ||
      meta.author?.fullName ||
      meta.user?.fullName ||
      meta.customer?.fullName

    if (directName) return String(directName).trim()

    return String(item.title || t.aParent || 'A parent').trim()
  }

  function getEventTypeLabel(type: string | undefined) {
    const eventTypes = t.eventTypes || {}
    const key = String(type || 'other')

    return eventTypes[key] || eventTypes.other || (lang === 'en' ? 'Calendar' : 'Kalender')
  }

  function getTypeLabel(item: NotificationItem) {
    if (isCustodyNotification(item)) return t.custody || (lang === 'en' ? 'Custody' : 'Omsorg')

    switch (item.type) {
      case 'calendar':
        return t.calendar || (lang === 'en' ? 'Calendar' : 'Kalender')
      case 'expense':
        return t.expense || (lang === 'en' ? 'Expense' : 'Økonomi')
      case 'request':
        return t.request || (lang === 'en' ? 'Request' : 'Forespørsel')
      case 'bank':
        return t.bank || 'Bank'
      case 'status':
        return t.status || 'Status'
      case 'documents':
        return t.documents || (lang === 'en' ? 'Documents' : 'Dokumenter')
      case 'post':
        return t.post || (lang === 'en' ? 'Updates' : 'Oppdateringer')
      default:
        return t.general || (lang === 'en' ? 'General' : 'Generelt')
    }
  }

  function buildNotificationTitle(item: NotificationItem) {
    const meta = item.meta || {}
    const childName = String(meta.childName || '').trim()
    const documentName = String(meta.documentName || item.title || '').trim()
    const rawTitle = String(item.title || t.general || 'Notification').trim()
    const isChildUpdate = !!meta.isChildUpdate

    if (isCustodyNotification(item)) {
      if (item.event === 'created') {
        return `${t.custodyCreated || 'Custody period created'}${childName ? ` for ${childName}` : ''}`
      }

      if (item.event === 'deleted') {
        return `${t.custodyDeleted || 'Custody period deleted'}${childName ? ` for ${childName}` : ''}`
      }

      if (item.event === 'updated') {
        if (meta.handoverStatus === 'ready') {
          return `${t.custodyReady || 'Ready for handover'}${childName ? ` for ${childName}` : ''}`
        }

        if (meta.handoverStatus === 'handed-over') {
          return `${t.custodyHandedOver || 'Child handed over'}${childName ? `: ${childName}` : ''}`
        }

        return `${t.custodyUpdated || 'Custody period updated'}${childName ? ` for ${childName}` : ''}`
      }
    }

    if (item.type === 'calendar' && meta.type === 'custody-emergency') {
      return `${meta.actorName || t.aParent || 'A parent'} ${t.requestedEmergencyChange || (lang === 'en' ? 'requested emergency change' : 'ber om hastebytte')}${childName ? ` for ${childName}` : ''}`
    }

    if (item.type === 'calendar' && meta.type === 'custody-emergency-response') {
      return meta.status === 'approved'
        ? `${t.emergencyApproved || 'Emergency change approved'}${childName ? ` for ${childName}` : ''}`
        : `${t.emergencyRejected || 'Emergency change rejected'}${childName ? ` for ${childName}` : ''}`
    }

    if (item.type === 'calendar') {
      const eventType = getEventTypeLabel(meta.eventType)

      if (item.event === 'created') return `${eventType} ${t.calendarCreated || 'created'}${childName ? ` for ${childName}` : ''}`
      if (item.event === 'updated') return `${eventType} ${t.calendarUpdated || 'updated'}${childName ? ` for ${childName}` : ''}`
      if (item.event === 'deleted') return `${eventType} ${t.calendarDeleted || 'deleted'}${childName ? ` for ${childName}` : ''}`
      if (item.event === 'confirmed') return `${eventType} ${t.calendarAccepted || 'accepted'}${childName ? ` for ${childName}` : ''}`
      if (item.event === 'declined') return `${eventType} ${t.calendarDeclined || 'declined'}${childName ? ` for ${childName}` : ''}`
    }

    if (item.type === 'documents') {
      if (item.event === 'uploaded') {
        return childName
          ? `${t.documentUploadedFor || 'Document uploaded for'} ${childName}`
          : documentName
            ? `${t.documentUploaded || 'Document uploaded'}: ${documentName}`
            : t.documentUploadedPlain || 'Document uploaded'
      }

      if (item.event === 'replaced') {
        return childName
          ? `${t.documentReplacedFor || 'Document replaced for'} ${childName}`
          : documentName
            ? `${t.documentReplaced || 'Document replaced'}: ${documentName}`
            : t.documentReplacedPlain || 'Document replaced'
      }

      if (item.event === 'updated') {
        return childName
          ? `${t.documentUpdatedFor || 'Document updated for'} ${childName}`
          : documentName
            ? `${t.documentUpdated || 'Document updated'}: ${documentName}`
            : t.documentUpdatedPlain || 'Document updated'
      }

      if (item.event === 'deleted') {
        return childName
          ? `${t.documentDeletedFor || 'Document deleted for'} ${childName}`
          : documentName
            ? `${t.documentDeleted || 'Document deleted'}: ${documentName}`
            : t.documentDeletedPlain || 'Document deleted'
      }
    }

    if (item.type === 'post') {
      if (item.event === 'created') return isChildUpdate ? `${t.newUpdate || 'New update'}${childName ? ` for ${childName}` : ''}` : t.newFamilyUpdate || 'New family update'
      if (item.event === 'updated') return isChildUpdate ? `${t.updateEdited || 'Update edited'}${childName ? ` for ${childName}` : ''}` : t.familyUpdateEdited || 'Family update edited'
      if (item.event === 'deleted') return isChildUpdate ? `${t.updateDeleted || 'Update deleted'}${childName ? ` for ${childName}` : ''}` : t.familyUpdateDeleted || 'Family update deleted'
      if (item.event === 'commented') return childName ? `${t.newCommentFor || 'New comment for'} ${childName}` : t.newCommentOnUpdate || 'New comment on update'
      if (item.event === 'liked') return childName ? `${t.updateLikedFor || 'Update liked for'} ${childName}` : t.updateLiked || 'Update liked'
    }

    return rawTitle
  }

  function buildNotificationMessage(item: NotificationItem) {
    const meta = item.meta || {}
    const actorName = String(meta.actorName || t.aParent || 'A parent').trim()
    const childName = String(meta.childName || '').trim()
    const documentName = shorten(meta.documentName || item.title || '')
    const postTitle = shorten(meta.title || item.message || '')
    const confirmedAt = String(meta.confirmedAt || '').trim()

    if (isCustodyNotification(item)) {
      const action =
        meta.handoverStatus === 'ready'
          ? t.markedReady || 'marked the custody period as ready for handover'
          : meta.handoverStatus === 'handed-over'
            ? t.confirmedHandover || 'confirmed that the child was handed over'
            : item.event === 'created'
              ? t.createdCustody || 'created a custody period'
              : item.event === 'deleted'
                ? t.deletedCustody || 'deleted a custody period'
                : t.updatedCustody || 'updated the custody plan'

      return [
        `${actorName} ${action}`,
        childName ? `${t.child || 'Child'}: ${childName}` : '',
        meta.currentParentName && meta.nextParentName ? `${meta.currentParentName} → ${meta.nextParentName}` : '',
        meta.startAt ? `${t.from || 'From'} ${formatDateTime(meta.startAt, lang)}` : '',
        meta.endAt ? `${t.to || 'To'} ${formatDateTime(meta.endAt, lang)}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    }

    if (item.type === 'calendar' && meta.type === 'custody-emergency') {
      return [
        meta.pickupAt ? `${t.pickup || 'Pickup'}: ${formatDateTime(meta.pickupAt, lang)}` : '',
        meta.returnAt ? `${t.lastsUntil || 'Lasts until'}: ${formatDateTime(meta.returnAt, lang)}` : '',
        item.message || meta.reason || t.emergencyRequested || 'Emergency custody change requested',
      ]
        .filter(Boolean)
        .join(' · ')
    }

    if (item.type === 'calendar' && meta.type === 'custody-emergency-response') {
      return [
        meta.status === 'approved'
          ? t.emergencyApproved || 'Emergency change approved'
          : t.emergencyRejected || 'Emergency change rejected',
        meta.pickupAt ? `${t.pickup || 'Pickup'}: ${formatDateTime(meta.pickupAt, lang)}` : '',
        meta.returnAt ? `${t.lastsUntil || 'Lasts until'}: ${formatDateTime(meta.returnAt, lang)}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    }

    if (item.type === 'calendar') {
      if (item.event === 'confirmed') {
        return `${actorName} ${t.acceptedEvent || 'accepted the event'}${confirmedAt ? ` ${confirmedAt}` : ''}.`
      }

      if (item.event === 'declined') {
        return `${actorName} ${t.declinedEvent || 'declined the event'}${confirmedAt ? ` ${confirmedAt}` : ''}.`
      }

      if (item.event === 'updated') {
        return `${actorName} ${t.updatedCalendarEvent || 'updated a calendar event'}${childName ? ` for ${childName}` : ''}.`
      }
    }

    if (item.type === 'documents') {
      if (item.event === 'uploaded') {
        return `${actorName} ${t.uploaded || 'uploaded'}${documentName ? ` "${documentName}"` : ` ${t.aDocument || 'a document'}`}.`
      }

      if (item.event === 'replaced') {
        return `${actorName} ${t.replaced || 'replaced'}${documentName ? ` "${documentName}"` : ` ${t.aDocument || 'a document'}`}.`
      }

      if (item.event === 'updated') {
        return `${actorName} ${t.updated || 'updated'}${documentName ? ` "${documentName}"` : ` ${t.aDocument || 'a document'}`}.`
      }

      if (item.event === 'deleted') {
        return `${actorName} ${t.deleted || 'deleted'}${documentName ? ` "${documentName}"` : ` ${t.aDocument || 'a document'}`}.`
      }
    }

    if (item.type === 'post') {
      if (item.event === 'created') {
        return childName
          ? `${actorName} ${t.createdThePost || 'created the post'} "${postTitle}" for ${childName}.`
          : `${actorName} ${t.createdThePost || 'created the post'} "${postTitle}".`
      }

      if (item.event === 'updated') {
        return childName
          ? `${actorName} ${t.updatedThePost || 'updated the post'} "${postTitle}" for ${childName}.`
          : `${actorName} ${t.updatedThePost || 'updated the post'} "${postTitle}".`
      }

      if (item.event === 'deleted') {
        return childName
          ? `${actorName} ${t.deletedThePost || 'deleted the post'} "${postTitle}" for ${childName}.`
          : `${actorName} ${t.deletedThePost || 'deleted the post'} "${postTitle}".`
      }

      if (item.event === 'commented') {
        return `${actorName} ${t.commentedOn || 'commented on'} "${postTitle}".`
      }

      if (item.event === 'liked') {
        return `${actorName} ${t.liked || 'liked'} "${postTitle}".`
      }
    }

    return item.message || t.openToViewDetails || 'Open to view details.'
  }

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
        throw new Error(json?.message || t.couldNotLoad || 'Could not load notifications.')
      }

      setItems(Array.isArray(json?.docs) ? json.docs : [])
    } catch (err: any) {
      setError(err?.message || t.couldNotLoad || 'Could not load notifications.')
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

      if (!recipientId) throw new Error(t.missingRecipient || 'Missing recipient for emergency response.')

      const meRes = await fetch('/api/customers/me', {
        credentials: 'include',
        cache: 'no-store',
      })

      const meJson = await meRes.json().catch(() => null)

      if (!meRes.ok) throw new Error(meJson?.message || t.couldNotGetMe || 'Could not load current user.')

      const meUser = meJson?.user || meJson
      const meId = meUser?.id

      if (!meId) throw new Error(t.missingCurrentUser || 'Missing current user.')

      const meName =
        meUser?.fullName ||
        `${meUser?.firstName || ''} ${meUser?.lastName || ''}`.trim() ||
        meUser?.email ||
        t.aParent ||
        'A parent'

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
          throw new Error(raw || t.couldNotRespond || 'Could not respond to the request.')
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
          throw new Error(raw || t.couldNotRespond || 'Could not respond to the request.')
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
          title:
            nextStatus === 'approved'
              ? t.emergencyApproved || 'Emergency change approved'
              : t.emergencyRejected || 'Emergency change rejected',
          message:
            nextStatus === 'approved'
              ? t.emergencyApproved || 'Emergency change approved'
              : t.emergencyRejected || 'Emergency change rejected',
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
        throw new Error(raw || t.couldNotRespond || 'Could not respond to the request.')
      }

      setSelectedEmergency(null)
      await loadNotifications()

      if (nextStatus === 'approved') {
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err?.message || t.couldNotRespond || 'Could not respond to the request.')
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
      const actorName = getActorName(item).toLowerCase()
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
          <h1 className={styles.title}>{t.title || 'All notifications'}</h1>
          <p className={styles.subtitle}>
            {t.subtitle ||
              'A full overview of updates across child profiles, posts, calendar, documents, and expenses.'}
          </p>
        </div>

        <button
          type="button"
          className={styles.markAllBtn}
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck size={16} />
          {markingAll ? t.saving || 'Saving...' : t.markAllRead || 'Mark all read'}
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t.total || 'Total'}</div>
          <div className={styles.summaryValue}>{items.length}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t.unread || 'Unread'}</div>
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
            {t.all || 'All'}
          </button>

          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'unread' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            {t.unreadTab || t.unread || 'Unread'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.state}>{t.loading || 'Loading notifications...'}</div>
      ) : error ? (
        <div className={styles.stateError}>{error}</div>
      ) : visibleItems.length === 0 ? (
        <div className={styles.state}>{t.empty || 'No notifications yet.'}</div>
      ) : (
        <div className={styles.list}>
          {visibleItems.map((item) => {
            const actorName = getActorName(item)
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
                      <div className={styles.itemTitle}>{buildNotificationTitle(item)}</div>
                      <div className={styles.itemMessage}>{buildNotificationMessage(item)}</div>
                    </div>

                    {isUnread ? <span className={styles.dot} /> : null}
                  </div>

                  <div className={styles.meta}>
                    <span>{getTypeLabel(item)}</span>
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
          {t.back || 'Back to dashboard'}
        </Link>
      </div>

      {selectedEmergency ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setSelectedEmergency(null)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{t.emergencyRequested || 'Emergency custody change requested'}</h3>
            </div>

            <div className={styles.modalBody}>
              <p>
                <strong>{selectedEmergency.meta?.actorName || t.aParent || 'A parent'}</strong>{' '}
                {t.requestedEmergencyCustodyChange ||
                  (lang === 'en' ? 'requested emergency custody change' : 'ber om hastebytte')}
                {selectedEmergency.meta?.childName ? ` for ${selectedEmergency.meta.childName}` : ''}.
              </p>

              {selectedEmergency.meta?.pickupAt ? (
                <p>
                  <strong>{t.pickup || 'Pickup'}:</strong>{' '}
                  {formatDateTime(selectedEmergency.meta.pickupAt, lang)}
                </p>
              ) : null}

              {selectedEmergency.meta?.returnAt ? (
                <p>
                  <strong>{t.lastsUntil || 'Lasts until'}:</strong>{' '}
                  {formatDateTime(selectedEmergency.meta.returnAt, lang)}
                </p>
              ) : null}

              <p>
                <strong>{t.reason || 'Reason'}:</strong>{' '}
                {selectedEmergency.message ||
                  selectedEmergency.meta?.reason ||
                  t.noReason ||
                  'No reason provided.'}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button type="button" onClick={() => setSelectedEmergency(null)} disabled={!!actionLoading}>
                {t.close || 'Close'}
              </button>

              <button
                type="button"
                onClick={() => respondEmergencyRequest('rejected')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'rejected' ? t.sending || 'Sending...' : t.reject || 'Reject'}
              </button>

              <button
                type="button"
                onClick={() => respondEmergencyRequest('approved')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'approved' ? t.sending || 'Sending...' : t.approve || 'Approve'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}