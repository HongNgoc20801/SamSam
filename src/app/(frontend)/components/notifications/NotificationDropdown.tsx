'use client'

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

function fmtTime(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

function getTypeLabel(type: NotificationItem['type']) {
  switch (type) {
    case 'calendar':
      return 'Calendar'
    case 'expense':
      return 'Payments'
    case 'request':
      return 'Requests'
    case 'bank':
      return 'Bank'
    case 'status':
      return 'Status'
    case 'documents':
      return 'Documents'
    case 'post':
      return 'Updates'
    default:
      return type
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

function buildNotificationTitle(item: NotificationItem) {
  const meta = item.meta || {}
  const childName = String(meta.childName || '').trim()
  const eventType = getEventTypeLabel(meta.eventType)
  const rawTitle = String(item.title || 'Notification').trim()
  const isChildUpdate = !!meta.isChildUpdate
  const documentName = String(meta.documentName || item.title || '').trim()
  const actorName = String(meta.actorName || 'A parent').trim()

  if (item.type === 'calendar') {
    if (item.event === 'created') return `${eventType} created${childName ? ` for ${childName}` : ''}`
    if (item.event === 'updated') return `${eventType} updated${childName ? ` for ${childName}` : ''}`
    if (item.event === 'deleted') return `${eventType} deleted${childName ? ` for ${childName}` : ''}`
    if (item.event === 'confirmed') return `${eventType} accepted${childName ? ` for ${childName}` : ''}`
    if (item.event === 'declined') return `${eventType} declined${childName ? ` for ${childName}` : ''}`
  }

  if (item.type === 'expense') {
    if (item.event === 'created') return `${actorName} created a payment item`
    if (item.event === 'updated') return `${actorName} updated a payment item`
    if (item.event === 'deleted') return `${actorName} deleted a payment item`
    if (item.event === 'paid') return `${actorName} paid a payment item`
  }

  if (item.type === 'request') {
    if (item.event === 'created') return `${actorName} created a money request`
    if (item.event === 'approved') return `${actorName} approved a money request`
    if (item.event === 'rejected') return `${actorName} rejected a money request`
    if (item.event === 'updated') return `${actorName} updated a money request`
    if (item.event === 'deleted') return `${actorName} deleted a money request`
  }

  if (item.type === 'bank') {
    if (item.event === 'created') return 'Bank connected'
    if (item.event === 'updated') return 'Bank status updated'
    if (item.event === 'declined') return 'Bank connection expired'
  }

  if (item.type === 'status') {
    if (item.event === 'created' && childName) return `New child profile: ${childName}`
    if (item.event === 'updated' && childName && meta.needsConfirmation) return `${childName} needs confirmation`
    if (item.event === 'updated' && childName) return `${childName} profile updated`
    if (item.event === 'confirmed' && childName) return `${childName} was confirmed`
    if (item.event === 'declined' && childName) return `${childName} was declined`
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
    if (item.event === 'confirmed') {
      return `${actorName} accepted this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    if (item.event === 'declined') {
      return `${actorName} declined this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    const parts = [
      meta.startAt ? fmtTime(meta.startAt) : '',
      meta.location || '',
      childName ? `Child: ${childName}` : '',
    ].filter(Boolean)

    if (parts.length) return parts.join(' · ')
  }

  if (item.type === 'expense') {
    return [
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      meta.transactionDate ? `Due ${fmtTime(meta.transactionDate)}` : '',
      childName ? `Child: ${childName}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'request') {
    return [
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      childName ? `Child: ${childName}` : '',
      meta.category || '',
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
  if (!open) return null

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Notifications</div>
          <div className={styles.sub}>{unreadCount} unread</div>
        </div>

        <button
          type="button"
          className={styles.markAll}
          onClick={onMarkAll}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll ? 'Saving...' : 'Mark all read'}
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>No notifications yet.</div>
        ) : (
          items.map((item) => (
            <button
              key={String(item.id)}
              type="button"
              className={`${styles.item} ${item.isRead ? styles.read : styles.unread}`}
              onClick={() => onItemClick(item)}
            >
              <div className={styles.iconWrap}>
                <NotificationTypeIcon type={item.type} />
              </div>

              <div className={styles.content}>
                <div className={styles.top}>
                  <div className={styles.itemTitle}>{buildNotificationTitle(item)}</div>
                  {!item.isRead ? <span className={styles.dot} /> : null}
                </div>

                <div className={styles.message}>{buildNotificationMessage(item)}</div>

                <div className={styles.meta}>
                  <span>{getTypeLabel(item.type)}</span>
                  <span>•</span>
                  <span>{fmtTime(item.createdAt)}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.viewAll} onClick={onViewAll}>
          View all notifications
        </button>
      </div>
    </div>
  )
}