'use client'

import { useMemo, useState } from 'react'
import styles from './notificationDropdown.module.css'

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

function formatRelativeTime(value?: string) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = Date.now()
  const diffMs = now - date.getTime()

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

function buildNotificationTitle(item: NotificationItem) {
  const meta = item.meta || {}
  const childName = String(meta.childName || '').trim()
  const eventType = getEventTypeLabel(meta.eventType)
  const rawTitle = String(item.title || 'Notification').trim()
  const isChildUpdate = !!meta.isChildUpdate
  const documentName = String(meta.documentName || item.title || '').trim()
  const actorName = String(meta.actorName || 'A parent').trim()

  if (item.type === 'calendar') {
    if (item.event === 'created') return `${actorName}`
    if (item.event === 'updated') return `${actorName}`
    if (item.event === 'deleted') return `${actorName}`
    if (item.event === 'confirmed') return `${actorName}`
    if (item.event === 'declined') return `${actorName}`
  }

  if (item.type === 'expense') {
    return actorName
  }

  if (item.type === 'request') {
    return actorName
  }

  if (item.type === 'bank') {
    return 'Bank'
  }

  if (item.type === 'status') {
    if (childName) return actorName
  }

  if (item.type === 'documents') {
    if (childName || documentName) return actorName
  }

  if (item.type === 'post') {
    return actorName
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
  const eventType = getEventTypeLabel(meta.eventType)

  if (item.type === 'calendar') {
    if (item.event === 'created') {
      return `${eventType.toLowerCase()} created${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'updated') {
      return `${eventType.toLowerCase()} updated${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'deleted') {
      return `${eventType.toLowerCase()} deleted${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'confirmed') {
      return `accepted this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    if (item.event === 'declined') {
      return `declined this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    const parts = [
      meta.startAt ? fmtTime(meta.startAt) : '',
      meta.location || '',
      childName ? childName : '',
    ].filter(Boolean)

    if (parts.length) return parts.join(' · ')
  }

  if (item.type === 'expense') {
    return [
      item.event === 'created' ? 'created a payment item' : '',
      item.event === 'updated' ? 'updated a payment item' : '',
      item.event === 'deleted' ? 'deleted a payment item' : '',
      item.event === 'paid' ? 'paid a payment item' : '',
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      childName ? childName : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'request') {
    return [
      item.event === 'created' ? 'created a money request' : '',
      item.event === 'approved' ? 'approved a money request' : '',
      item.event === 'rejected' ? 'rejected a money request' : '',
      item.event === 'updated' ? 'updated a money request' : '',
      item.event === 'deleted' ? 'deleted a money request' : '',
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      childName ? childName : '',
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
      return `created child profile for ${childName}.`
    }

    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return `updated ${childName}'s profile. Waiting for confirmation.`
    }

    if (item.event === 'updated' && childName) {
      return `updated ${childName}'s profile.`
    }

    if (item.event === 'confirmed' && childName) {
      return `confirmed ${childName}'s profile.`
    }

    if (item.event === 'declined' && childName) {
      return `declined ${childName}'s profile.`
    }
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return `uploaded ${documentName ? `"${documentName}"` : 'a document'}.`
    }

    if (item.event === 'replaced') {
      return `replaced ${documentName ? `"${documentName}"` : 'a document'}.`
    }

    if (item.event === 'updated') {
      return `updated ${documentName ? `"${documentName}"` : 'a document'}.`
    }

    if (item.event === 'deleted') {
      return `deleted ${documentName ? `"${documentName}"` : 'a document'}.`
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return childName
        ? `posted an update for ${childName}: "${postTitle}".`
        : `posted: "${postTitle}".`
    }

    if (item.event === 'updated') {
      return childName
        ? `updated a post for ${childName}: "${postTitle}".`
        : `updated the post "${postTitle}".`
    }

    if (item.event === 'deleted') {
      return childName
        ? `deleted a post for ${childName}: "${postTitle}".`
        : `deleted the post "${postTitle}".`
    }

    if (item.event === 'commented') {
      return `commented on "${postTitle}".`
    }

    if (item.event === 'liked') {
      return `liked "${postTitle}".`
    }
  }

  return item.message || 'Open to view details.'
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
          <path
            d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )

    case 'request':
      return (
        <svg {...common}>
          <path
            d="M12 3v18M3 12h18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
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
          <path
            d="M8 9h8M8 12h8M8 15h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
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
          <h2 className={styles.title}>Siste varsler</h2>
        </div>

        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${styles.activeTab}`}>
            All
          </button>

          <button type="button" className={styles.tab}>
            Unread
          </button>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span>New</span>

        <button type="button" className={styles.seeAllBtn} onClick={onViewAll}>
          See all
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>Loading notifications...</div>
        ) : visibleItems.length === 0 ? (
          <div className={styles.empty}>No notifications yet.</div>
        ) : (
          visibleItems.map((item) => {
            const avatarUrl = getAvatarUrl(item)
            const actorName = String(item.meta?.actorName || item.title || 'Notification')
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

                  <div
                    className={`${styles.smallTypeIcon} ${
                      styles[`smallTypeIcon--${item.type}`] || ''
                    }`}
                  >
                    <NotificationTypeIcon type={item.type} />
                  </div>
                </div>

                <div className={styles.content}>
                  <p className={styles.notificationText}>
                    <strong>{buildNotificationTitle(item)}</strong>{' '}
                    <span>{buildNotificationMessage(item)}</span>
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