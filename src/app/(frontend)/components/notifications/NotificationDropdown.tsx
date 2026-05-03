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

function getEventTypeLabel(type?: string) {
  switch (String(type || 'other')) {
    case 'handover':
      return 'Levering'
    case 'pickup':
      return 'Henting'
    case 'dropoff':
      return 'Levering'
    case 'school':
      return 'Skole'
    case 'activity':
      return 'Aktivitet'
    case 'medical':
      return 'Medisinsk'
    case 'payment':
      return 'Betaling'
    default:
      return 'Kalender'
  }
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

function buildNotificationTitle(item: NotificationItem) {
  const meta = item.meta || {}
  const actorName = String(meta.actorName || item.title || 'En forelder').trim()
  const childName = String(meta.childName || '').trim()
  const documentName = String(meta.documentName || item.title || '').trim()
  const eventType = getEventTypeLabel(meta.eventType)
  const rawTitle = String(item.title || 'Varsel').trim()
  const isChildUpdate = !!meta.isChildUpdate

  if (meta.type === 'custody-schedule') {
    if (item.event === 'created') {
      return `Omsorgsperiode opprettet${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'updated') {
      if (meta.handoverStatus === 'ready') {
        return `Klar for bytte${childName ? ` for ${childName}` : ''}`
      }

      if (meta.handoverStatus === 'handed-over') {
        return `Barn mottatt${childName ? `: ${childName}` : ''}`
      }

      return `Omsorgsperiode oppdatert${childName ? ` for ${childName}` : ''}`
    }
  }

  if (meta.type === 'custody-emergency') {
    return `${actorName} ber om hastebytte${childName ? ` for ${childName}` : ''}`
  }

  if (meta.type === 'custody-emergency-response') {
    return meta.status === 'approved'
      ? `Hastebytte godkjent${childName ? ` for ${childName}` : ''}`
      : `Hastebytte avslått${childName ? ` for ${childName}` : ''}`
  }

  if (item.type === 'calendar') {
    if (item.event === 'created') {
      return `${eventType} opprettet${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'updated') {
      return `${eventType} oppdatert${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'deleted') {
      return `${eventType} slettet${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'confirmed') {
      return `${eventType} godkjent${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'declined') {
      return `${eventType} avslått${childName ? ` for ${childName}` : ''}`
    }
  }

  if (item.type === 'expense') return actorName
  if (item.type === 'request') return actorName
  if (item.type === 'bank') return 'Bank'

  if (item.type === 'status') {
    if (item.event === 'created' && childName) return `Ny barneprofil: ${childName}`
    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return `${childName} trenger bekreftelse`
    }
    if (item.event === 'updated' && childName) return `${childName} profil oppdatert`
    if (item.event === 'confirmed' && childName) return `${childName} ble bekreftet`
    if (item.event === 'declined' && childName) return `${childName} ble avslått`
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return childName
        ? `Dokument lastet opp for ${childName}`
        : documentName
          ? `Dokument lastet opp: ${documentName}`
          : 'Dokument lastet opp'
    }

    if (item.event === 'replaced') {
      return childName
        ? `Dokument erstattet for ${childName}`
        : documentName
          ? `Dokument erstattet: ${documentName}`
          : 'Dokument erstattet'
    }

    if (item.event === 'updated') {
      return childName
        ? `Dokument oppdatert for ${childName}`
        : documentName
          ? `Dokument oppdatert: ${documentName}`
          : 'Dokument oppdatert'
    }

    if (item.event === 'deleted') {
      return childName
        ? `Dokument slettet for ${childName}`
        : documentName
          ? `Dokument slettet: ${documentName}`
          : 'Dokument slettet'
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return isChildUpdate
        ? `Ny oppdatering${childName ? ` for ${childName}` : ''}`
        : 'Ny familieoppdatering'
    }

    if (item.event === 'updated') {
      return isChildUpdate
        ? `Oppdatering redigert${childName ? ` for ${childName}` : ''}`
        : 'Familieoppdatering redigert'
    }

    if (item.event === 'deleted') {
      return isChildUpdate
        ? `Oppdatering slettet${childName ? ` for ${childName}` : ''}`
        : 'Familieoppdatering slettet'
    }

    if (item.event === 'commented') {
      return childName ? `Ny kommentar for ${childName}` : 'Ny kommentar på oppdatering'
    }

    if (item.event === 'liked') {
      return childName ? `Oppdatering likt for ${childName}` : 'Oppdatering likt'
    }
  }

  return rawTitle
}

function buildNotificationMessage(item: NotificationItem) {
  const meta = item.meta || {}
  const actorName = String(meta.actorName || 'En forelder').trim()
  const childName = String(meta.childName || '').trim()
  const documentName = shorten(meta.documentName || item.title || '')
  const postTitle = shorten(meta.title || item.message || '')
  const confirmedAt = String(meta.confirmedAt || '').trim()

  if (meta.type === 'custody-schedule') {
    const route =
      meta.currentParentName && meta.nextParentName
        ? `${meta.currentParentName} → ${meta.nextParentName}`
        : ''

    if (item.event === 'created') {
      return [
        `${actorName} opprettet en omsorgsperiode`,
        childName,
        route,
        meta.startAt ? fmtTime(meta.startAt) : '',
      ]
        .filter(Boolean)
        .join(' · ')
    }

    if (meta.handoverStatus === 'ready') {
      return `${actorName} markerte barnet som klart for bytte.`
    }

    if (meta.handoverStatus === 'handed-over') {
      return `${actorName} bekreftet mottak av barnet.`
    }

    return [
      `${actorName} oppdaterte en omsorgsperiode`,
      childName,
      route,
      meta.startAt ? fmtTime(meta.startAt) : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (meta.type === 'custody-emergency') {
    return [
      meta.pickupAt ? `Henting: ${fmtTime(meta.pickupAt)}` : '',
      meta.returnAt ? `Varer til: ${fmtTime(meta.returnAt)}` : '',
      item.message || meta.reason || 'Hastebytte forespurt.',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (meta.type === 'custody-emergency-response') {
    return [
      meta.status === 'approved'
        ? 'Den andre forelderen har godkjent hastebytte.'
        : 'Den andre forelderen har avslått hastebytte.',
      meta.pickupAt ? `Henting: ${fmtTime(meta.pickupAt)}` : '',
      meta.returnAt ? `Varer til: ${fmtTime(meta.returnAt)}` : '',
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'calendar') {
    const eventType = getEventTypeLabel(meta.eventType).toLowerCase()

    if (item.event === 'created') {
      return `${actorName} opprettet ${eventType}${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'updated') {
      return `${actorName} oppdaterte en kalenderhendelse.`
    }

    if (item.event === 'deleted') {
      return `${actorName} slettet ${eventType}${childName ? ` for ${childName}` : ''}.`
    }

    if (item.event === 'confirmed') {
      return `${actorName} godkjente hendelsen${confirmedAt ? ` ${confirmedAt}` : ''}.`
    }

    if (item.event === 'declined') {
      return `${actorName} avslo hendelsen${confirmedAt ? ` ${confirmedAt}` : ''}.`
    }
  }

  if (item.type === 'expense') {
    return [
      item.event === 'created' ? 'opprettet en betaling' : '',
      item.event === 'updated' ? 'oppdaterte en betaling' : '',
      item.event === 'deleted' ? 'slettet en betaling' : '',
      item.event === 'paid' ? 'betalte en betaling' : '',
      meta.amount ? fmtMoney(meta.amount, meta.currency || 'NOK') : '',
      childName,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (item.type === 'request') {
    return [
      item.event === 'created' ? 'opprettet en pengeforespørsel' : '',
      item.event === 'approved' ? 'godkjente en pengeforespørsel' : '',
      item.event === 'rejected' ? 'avslo en pengeforespørsel' : '',
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
      return `${actorName} opprettet barneprofilen. Venter på bekreftelse.`
    }

    if (item.event === 'updated' && childName && meta.needsConfirmation) {
      return `${actorName} oppdaterte profilen. Venter på bekreftelse.`
    }

    if (item.event === 'updated' && childName) {
      return `${actorName} oppdaterte barneprofilen.`
    }

    if (item.event === 'confirmed' && childName) {
      return `${actorName} bekreftet barneprofilen.`
    }

    if (item.event === 'declined' && childName) {
      return `${actorName} avslo barneprofilen.`
    }
  }

  if (item.type === 'documents') {
    if (item.event === 'uploaded') {
      return `${actorName} lastet opp${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }

    if (item.event === 'replaced') {
      return `${actorName} erstattet${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }

    if (item.event === 'updated') {
      return `${actorName} oppdaterte${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }

    if (item.event === 'deleted') {
      return `${actorName} slettet${documentName ? ` "${documentName}"` : ' et dokument'}.`
    }
  }

  if (item.type === 'post') {
    if (item.event === 'created') {
      return childName
        ? `${actorName} opprettet innlegget "${postTitle}" for ${childName}.`
        : `${actorName} opprettet innlegget "${postTitle}".`
    }

    if (item.event === 'updated') {
      return childName
        ? `${actorName} oppdaterte innlegget "${postTitle}" for ${childName}.`
        : `${actorName} oppdaterte innlegget "${postTitle}".`
    }

    if (item.event === 'deleted') {
      return childName
        ? `${actorName} slettet innlegget "${postTitle}" for ${childName}.`
        : `${actorName} slettet innlegget "${postTitle}".`
    }

    if (item.event === 'commented') {
      return `${actorName} kommenterte på "${postTitle}".`
    }

    if (item.event === 'liked') {
      return `${actorName} likte "${postTitle}".`
    }
  }

  return item.message || 'Åpne for å se detaljer.'
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

          {unreadCount > 0 ? (
            <button
              type="button"
              className={styles.seeAllBtn}
              onClick={onMarkAll}
              disabled={markingAll}
            >
              {markingAll ? 'Lagrer...' : 'Merk alle lest'}
            </button>
          ) : null}
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Alle
          </button>

          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'unread' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            Ulest
          </button>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span>Nye</span>

        <button type="button" className={styles.seeAllBtn} onClick={onViewAll}>
          Se alle
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>Laster varsler...</div>
        ) : visibleItems.length === 0 ? (
          <div className={styles.empty}>Ingen varsler ennå.</div>
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