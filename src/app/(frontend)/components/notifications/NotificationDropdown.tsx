'use client'

import styles from './notificationDropdown.module.css'

export type NotificationItem = {
  id: string | number
  title: string
  message?: string
  link?: string
  isRead: boolean
  type: 'calendar' | 'expense' | 'status' | 'documents'
  event:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'confirmed'
    | 'commented'
    | 'liked'
    | 'uploaded'
    | 'replaced'
  createdAt?: string
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

function getTypeLabel(type: NotificationItem['type']) {
  switch (type) {
    case 'calendar':
      return 'Calendar'
    case 'expense':
      return 'Expenses'
    case 'status':
      return 'Status'
    case 'documents':
      return 'Documents'
    default:
      return type
  }
}

function NotificationTypeIcon({
  type,
}: {
  type: NotificationItem['type']
}) {
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
                  <div className={styles.itemTitle}>{item.title}</div>
                  {!item.isRead ? <span className={styles.dot} /> : null}
                </div>

                {item.message ? <div className={styles.message}>{item.message}</div> : null}

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