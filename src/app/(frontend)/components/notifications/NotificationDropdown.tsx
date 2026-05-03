'use client'

import { useMemo, useState } from 'react'
import styles from './notificationDropdown.module.css'
import { useSettings } from '@/app/(frontend)/components/providers/SettingsProvider'

type Lang = 'no' | 'en'

export type NotificationEventType =
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

export type NotificationItem = {
  id: string | number
  title?: string
  message?: string
  link?: string
  isRead: boolean
  readAt?: string | null
  type: 'calendar' | 'expense' | 'request' | 'bank' | 'status' | 'documents' | 'post'
  event: NotificationEventType
  createdAt?: string
  meta?: Record<string, any>
}

type Props = {
  open: boolean
  loading: boolean
  markingAll: boolean
  unreadCount: number
  items: NotificationItem[]
  onMarkAll: () => void
  onItemClick: (item: NotificationItem) => void
  onViewAll: () => void
}

const text = {
  no: {
    latest: 'Siste varsler',
    markAllRead: 'Merk alle lest',
    saving: 'Lagrer...',
    all: 'Alle',
    unread: 'Ulest',
    new: 'Nye',
    viewAll: 'Se alle',
    loading: 'Laster varsler...',
    empty: 'Ingen varsler ennå.',
    aParent: 'En forelder',
    openDetails: 'Åpne for å se detaljer.',
    custodyCreated: 'Omsorgsperiode opprettet',
    custodyUpdated: 'Omsorgsperiode oppdatert',
    custodyDeleted: 'Omsorgsperiode slettet',
    custodyReady: 'Klar for bytte',
    custodyHandedOver: 'Barn mottatt',
    createdCustody: 'opprettet en omsorgsperiode',
    updatedCustody: 'oppdaterte en omsorgsperiode',
    deletedCustody: 'slettet en omsorgsperiode',
    markedReady: 'markerte barnet som klart for bytte',
    confirmedHandover: 'bekreftet mottak av barnet',
    emergencyRequested: 'ber om hastebytte',
    emergencyApproved: 'Hastebytte godkjent',
    emergencyRejected: 'Hastebytte avslått',
    calendarCreated: 'opprettet',
    calendarUpdated: 'oppdatert',
    calendarDeleted: 'slettet',
    calendarConfirmed: 'godkjent',
    calendarDeclined: 'avslått',
    eventTypes: {
      custody: 'Omsorgsperiode',
      handover: 'Levering',
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
    latest: 'Latest notifications',
    markAllRead: 'Mark all read',
    saving: 'Saving...',
    all: 'All',
    unread: 'Unread',
    new: 'New',
    viewAll: 'View all',
    loading: 'Loading notifications...',
    empty: 'No notifications yet.',
    aParent: 'A parent',
    openDetails: 'Open to view details.',
    custodyCreated: 'Custody period created',
    custodyUpdated: 'Custody period updated',
    custodyDeleted: 'Custody period deleted',
    custodyReady: 'Ready for handover',
    custodyHandedOver: 'Child handed over',
    createdCustody: 'created a custody period',
    updatedCustody: 'updated a custody period',
    deletedCustody: 'deleted a custody period',
    markedReady: 'marked the child as ready for handover',
    confirmedHandover: 'confirmed receiving the child',
    emergencyRequested: 'requested emergency change',
    emergencyApproved: 'Emergency change approved',
    emergencyRejected: 'Emergency change rejected',
    calendarCreated: 'created',
    calendarUpdated: 'updated',
    calendarDeleted: 'deleted',
    calendarConfirmed: 'confirmed',
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

function formatRelativeTime(value?: string) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return 'now'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d`

  return date.toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
  })
}

function fmtTime(value?: string) {
  if (!value) return ''

  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtMoney(amount?: number, currency = 'NOK') {
  const value = Number(amount || 0)

  try {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
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

function getAvatarUrl(item: NotificationItem) {
  const meta = item.meta || {}

  return (
    getMediaUrl(meta.actorAvatarUrl) ||
    getMediaUrl(meta.actorAvatar) ||
    getMediaUrl(meta.avatarUrl) ||
    getMediaUrl(meta.avatar) ||
    ''
  )
}

function getEventTypeLabel(type: string | undefined, lang: Lang) {
  const t = text[lang]
  const key = String(type || 'other') as keyof typeof t.eventTypes

  return t.eventTypes[key] || t.eventTypes.other
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

function buildNotificationTitle(item: NotificationItem, lang: Lang) {
  const t = text[lang]
  const meta = item.meta || {}
  const actorName = String(meta.actorName || item.title || t.aParent).trim()
  const childName = String(meta.childName || '').trim()
  const documentName = String(meta.documentName || item.title || '').trim()
  const rawTitle = String(item.title || 'Varsel').trim()
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

  if (meta.type === 'custody-emergency') {
    return `${actorName} ${t.emergencyRequested}${childName ? ` for ${childName}` : ''}`
  }

  if (meta.type === 'custody-emergency-response') {
    return meta.status === 'approved'
      ? `${t.emergencyApproved}${childName ? ` for ${childName}` : ''}`
      : `${t.emergencyRejected}${childName ? ` for ${childName}` : ''}`
  }

  if (item.type === 'calendar') {
    const eventType = getEventTypeLabel(meta.eventType, lang)

    if (item.event === 'created') {
      return `${eventType} ${t.calendarCreated}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'updated') {
      return `${eventType} ${t.calendarUpdated}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'deleted') {
      return `${eventType} ${t.calendarDeleted}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'confirmed') {
      return `${eventType} ${t.calendarConfirmed}${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'declined') {
      return `${eventType} ${t.calendarDeclined}${childName ? ` for ${childName}` : ''}`
    }
  }

  if (item.type === 'expense') return actorName
  if (item.type === 'request') return actorName
  if (item.type === 'bank') return 'Bank'

  if (item.type === 'status') {
    if (item.event === 'created' && childName) {
      return lang === 'en' ? `New child profile: ${childName}` : `Ny barneprofil: ${childName}`
    }

    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return lang === 'en' ? `${childName} needs confirmation` : `${childName} trenger bekreftelse`
    }

    if (item.event === 'updated' && childName) {
      return lang === 'en' ? `${childName} profile updated` : `${childName} profil oppdatert`
    }

    if (item.event === 'confirmed' && childName) {
      return lang === 'en' ? `${childName} was confirmed` : `${childName} ble bekreftet`
    }

    if (item.event === 'declined' && childName) {
      return lang === 'en' ? `${childName} was declined` : `${childName} ble avslått`
    }
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

    if (item.event === 'replaced') {
      return childName
        ? lang === 'en'
          ? `Document replaced for ${childName}`
          : `Dokument erstattet for ${childName}`
        : documentName
          ? lang === 'en'
            ? `Document replaced: ${documentName}`
            : `Dokument erstattet: ${documentName}`
          : lang === 'en'
            ? 'Document replaced'
            : 'Dokument erstattet'
    }

    if (item.event === 'updated') {
      return childName
        ? lang === 'en'
          ? `Document updated for ${childName}`
          : `Dokument oppdatert for ${childName}`
        : documentName
          ? lang === 'en'
            ? `Document updated: ${documentName}`
            : `Dokument oppdatert: ${documentName}`
          : lang === 'en'
            ? 'Document updated'
            : 'Dokument oppdatert'
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

    if (item.event === 'updated') {
      return isChildUpdate
        ? lang === 'en'
          ? `Update edited${childName ? ` for ${childName}` : ''}`
          : `Oppdatering redigert${childName ? ` for ${childName}` : ''}`
        : lang === 'en'
          ? 'Family update edited'
          : 'Familieoppdatering redigert'
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

    if (item.event === 'commented') {
      return childName
        ? lang === 'en'
          ? `New comment for ${childName}`
          : `Ny kommentar for ${childName}`
        : lang === 'en'
          ? 'New comment on update'
          : 'Ny kommentar på oppdatering'
    }

    if (item.event === 'liked') {
      return childName
        ? lang === 'en'
          ? `Update liked for ${childName}`
          : `Oppdatering likt for ${childName}`
        : lang === 'en'
          ? 'Update liked'
          : 'Oppdatering likt'
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
    const route =
      meta.currentParentName && meta.nextParentName
        ? `${meta.currentParentName} → ${meta.nextParentName}`
        : ''

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
      childName,
      route,
      meta.startAt ? fmtTime(meta.startAt) : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (meta.type === 'custody-emergency') {
    return [
      meta.pickupAt ? `${lang === 'en' ? 'Pickup' : 'Henting'}: ${fmtTime(meta.pickupAt)}` : '',
      meta.returnAt ? `${lang === 'en' ? 'Lasts until' : 'Varer til'}: ${fmtTime(meta.returnAt)}` : '',
      item.message || meta.reason || (lang === 'en' ? 'Emergency change requested.' : 'Hastebytte forespurt.'),
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (meta.type === 'custody-emergency-response') {
    return [
      meta.status === 'approved' ? t.emergencyApproved : t.emergencyRejected,
      meta.pickupAt ? `${lang === 'en' ? 'Pickup' : 'Henting'}: ${fmtTime(meta.pickupAt)}` : '',
      meta.returnAt ? `${lang === 'en' ? 'Lasts until' : 'Varer til'}: ${fmtTime(meta.returnAt)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'calendar') {
    const eventType = getEventTypeLabel(meta.eventType, lang).toLowerCase()

    if (item.event === 'created') {
      return lang === 'en'
        ? `${actorName} created ${eventType}${childName ? ` for ${childName}` : ''}.`
        : `${actorName} opprettet ${eventType}${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'updated') {
      return lang === 'en'
        ? `${actorName} updated a calendar event.`
        : `${actorName} oppdaterte en kalenderhendelse.`
    }

    if (item.event === 'deleted') {
      return lang === 'en'
        ? `${actorName} deleted ${eventType}${childName ? ` for ${childName}` : ''}.`
        : `${actorName} slettet ${eventType}${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'confirmed') {
      return lang === 'en'
        ? `${actorName} accepted the event${confirmedAt ? ` ${confirmedAt}` : ''}.`
        : `${actorName} godkjente hendelsen${confirmedAt ? ` ${confirmedAt}` : ''}.`
    }

    if (item.event === 'declined') {
      return lang === 'en'
        ? `${actorName} declined the event${confirmedAt ? ` ${confirmedAt}` : ''}.`
        : `${actorName} avslo hendelsen${confirmedAt ? ` ${confirmedAt}` : ''}.`
    }
  }

  if (item.type === 'expense') {
    return [
      item.event === 'created' ? (lang === 'en' ? 'created a payment' : 'opprettet en betaling') : '',
      item.event === 'updated' ? (lang === 'en' ? 'updated a payment' : 'oppdaterte en betaling') : '',
      item.event === 'deleted' ? (lang === 'en' ? 'deleted a payment' : 'slettet en betaling') : '',
      item.event === 'paid' ? (lang === 'en' ? 'paid a payment' : 'betalte en betaling') : '',
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      childName,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'request') {
    return [
      item.event === 'created' ? (lang === 'en' ? 'created a money request' : 'opprettet en pengeforespørsel') : '',
      item.event === 'approved' ? (lang === 'en' ? 'approved a money request' : 'godkjente en pengeforespørsel') : '',
      item.event === 'rejected' ? (lang === 'en' ? 'rejected a money request' : 'avslo en pengeforespørsel') : '',
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      childName,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'bank') {
    return [meta.bankName || '', meta.connectionScope || '', meta.status || '']
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'status') {
    if (item.event === 'created' && childName) {
      return lang === 'en'
        ? `${actorName} created the child profile. Waiting for confirmation.`
        : `${actorName} opprettet barneprofilen. Venter på bekreftelse.`
    }

    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return lang === 'en'
        ? `${actorName} updated the profile. Waiting for confirmation.`
        : `${actorName} oppdaterte profilen. Venter på bekreftelse.`
    }

    if (item.event === 'updated' && childName) {
      return lang === 'en'
        ? `${actorName} updated the child profile.`
        : `${actorName} oppdaterte barneprofilen.`
    }

    if (item.event === 'confirmed' && childName) {
      return lang === 'en'
        ? `${actorName} confirmed the child profile.`
        : `${actorName} bekreftet barneprofilen.`
    }

    if (item.event === 'declined' && childName) {
      return lang === 'en'
        ? `${actorName} declined the child profile.`
        : `${actorName} avslo barneprofilen.`
    }
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return lang === 'en'
        ? `${actorName} uploaded${documentName ? ` "${documentName}"` : ' a document'}.`
        : `${actorName} lastet opp${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }

    if (item.event === 'replaced') {
      return lang === 'en'
        ? `${actorName} replaced${documentName ? ` "${documentName}"` : ' a document'}.`
        : `${actorName} erstattet${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }

    if (item.event === 'updated') {
      return lang === 'en'
        ? `${actorName} updated${documentName ? ` "${documentName}"` : ' a document'}.`
        : `${actorName} oppdaterte${documentName ? ` "${documentName}"` : ' et dokument'}.`
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
          ? `${actorName} created the post "${postTitle}" for ${childName}.`
          : `${actorName} opprettet innlegget "${postTitle}" for ${childName}.`
        : lang === 'en'
          ? `${actorName} created the post "${postTitle}".`
          : `${actorName} opprettet innlegget "${postTitle}".`
    }

    if (item.event === 'updated') {
      return childName
        ? lang === 'en'
          ? `${actorName} updated the post "${postTitle}" for ${childName}.`
          : `${actorName} oppdaterte innlegget "${postTitle}" for ${childName}.`
        : lang === 'en'
          ? `${actorName} updated the post "${postTitle}".`
          : `${actorName} oppdaterte innlegget "${postTitle}".`
    }

    if (item.event === 'deleted') {
      return childName
        ? lang === 'en'
          ? `${actorName} deleted the post "${postTitle}" for ${childName}.`
          : `${actorName} slettet innlegget "${postTitle}" for ${childName}.`
        : lang === 'en'
          ? `${actorName} deleted the post "${postTitle}".`
          : `${actorName} slettet innlegget "${postTitle}".`
    }

    if (item.event === 'commented') {
      return lang === 'en'
        ? `${actorName} commented on "${postTitle}".`
        : `${actorName} kommenterte på "${postTitle}".`
    }

    if (item.event === 'liked') {
      return lang === 'en'
        ? `${actorName} liked "${postTitle}".`
        : `${actorName} likte "${postTitle}".`
    }
  }

  return item.message || t.openDetails
}

function NotificationTypeIcon({ type }: { type: NotificationItem['type'] }) {
  const common = {
    className: styles.typeIcon,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  }

  switch (type) {
    case 'calendar':
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

    case 'status':
      return (
        <svg {...common}>
          <path
            d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
            stroke="currentColor"
            strokeWidth="1.8"
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
  }
}

export default function NotificationDropdown({
  open,
  loading,
  markingAll,
  unreadCount,
  items,
  onMarkAll,
  onItemClick,
  onViewAll,
}: Props) {
  const { settings } = useSettings()
  const lang: Lang = settings?.language === 'en' ? 'en' : 'no'
  const t = text[lang]

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')

  const visibleItems = useMemo(() => {
    if (activeTab === 'unread') {
      return items.filter((item) => !item.isRead)
    }

    return items
  }, [activeTab, items])

  if (!open) return null

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h2 className={styles.title}>{t.latest}</h2>

          {unreadCount > 0 ? (
            <button
              type="button"
              className={styles.seeAllBtn}
              onClick={onMarkAll}
              disabled={markingAll}
            >
              {markingAll ? t.saving : t.markAllRead}
            </button>
          ) : null}
        </div>

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
            {t.unread}
          </button>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span>{t.new}</span>

        <button type="button" className={styles.seeAllBtn} onClick={onViewAll}>
          {t.viewAll}
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>{t.loading}</div>
        ) : visibleItems.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          visibleItems.map((item) => {
            const avatarUrl = getAvatarUrl(item)
            const actorName = String(item.meta?.actorName || item.title || 'Varsel')
            const fallbackInitials = getInitials(actorName)

            return (
              <button
                key={String(item.id)}
                type="button"
                className={`${styles.item} ${item.isRead ? styles.read : styles.unread}`}
                onClick={() => onItemClick(item)}
              >
                <div className={styles.avatarWrap}>
                  <div className={styles.avatar}>
                    {avatarUrl ? (
                      <img className={styles.avatarImg} src={avatarUrl} alt={actorName} />
                    ) : (
                      fallbackInitials
                    )}
                  </div>

                  <div className={`${styles.smallTypeIcon} ${styles[`smallTypeIcon--${item.type}`] || ''}`}>
                    <NotificationTypeIcon type={item.type} />
                  </div>
                </div>

                <div className={styles.content}>
                  <p className={styles.notificationText}>
                    <strong>{buildNotificationTitle(item, lang)}</strong>{' '}
                    <span>{buildNotificationMessage(item, lang)}</span>
                  </p>

                  <p className={styles.timeText}>{formatRelativeTime(item.createdAt)}</p>
                </div>

                {!item.isRead ? <span className={styles.unreadDot} /> : null}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}