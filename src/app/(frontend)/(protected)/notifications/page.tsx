'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import styles from './notificationsPage.module.css'

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

function formatDateTime(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return format(d, 'dd.MM.yyyy HH:mm')
}

function getTypeLabel(type?: NotificationItem['type']) {
  switch (type) {
    case 'calendar':
      return 'Calendar'
    case 'expense':
      return 'Expense'
    case 'status':
      return 'Status'
    case 'documents':
      return 'Documents'
    case 'post':
      return 'Updates'
    default:
      return 'General'
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

  if (meta.type === 'custody-emergency') {
    return `${meta.actorName || 'A parent'} ber om hastebytte${meta.childName ? ` for ${meta.childName}` : ''}`
  }
  if (item.type === 'calendar') {
    if (item.event === 'created') {
      return `${eventType} created${childName ? ` for ${childName}` : ''}`
    }

    if (
      item.event === 'updated' &&
      meta.requiresConfirmation &&
      meta.confirmationStatus === 'pending'
    ) {
      return `${eventType} needs confirmation${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'updated') {
      return `${eventType} updated${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'deleted') {
      return `${eventType} deleted${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'confirmed') {
      return `${eventType} accepted${childName ? ` for ${childName}` : ''}`
    }

    if (item.event === 'declined') {
      return `${eventType} declined${childName ? ` for ${childName}` : ''}`
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

  if (meta.type === 'custody-emergency') {
    const reason = item.message || meta.reason || 'Hastebytte forespurt.'

    const parts = [
      meta.pickupAt ? `Henting: ${formatDateTime(meta.pickupAt)}` : '',
      meta.returnAt ? `Varer til: ${formatDateTime(meta.returnAt)}` : '',
      reason,
    ].filter(Boolean)

    return parts.join(' · ')
  }
  if (item.type === 'calendar') {
    if (item.event === 'confirmed') {
      return `${actorName} accepted this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    if (item.event === 'declined') {
      return `${actorName} declined this event${confirmedAt ? ` at ${confirmedAt}` : ''}.`
    }

    if (
      item.event === 'updated' &&
      meta.requiresConfirmation &&
      meta.confirmationStatus === 'pending'
    ) {
      return `${actorName} updated this event. Waiting for second parent confirmation.`
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

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState('')
  const [selectedEmergency, setSelectedEmergency] = useState<NotificationItem | null>(null)
  const [actionLoading, setActionLoading] = useState('')
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
        throw new Error(json?.message || 'Could not load notifications.')
      }

      setItems(Array.isArray(json?.docs) ? json.docs : [])
    } catch (err: any) {
      setError(err?.message || 'Could not load notifications.')
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

      if (!recipientId) {
        throw new Error('Mangler mottaker for svar på hastebytte.')
      }

      if (nextStatus === 'approved') {
        const custodyId = meta.custodyId
        const childId = meta.childId
        const pickupAt = meta.pickupAt
        const returnAt = meta.returnAt

        if (!custodyId) {
          throw new Error('Mangler omsorgsperiode for hastebytte.')
        }

        if (!childId) {
          throw new Error('Mangler barn for hastebytte.')
        }

        if (!pickupAt) {
          throw new Error('Mangler hentetidspunkt for hastebytte.')
        }

        if (!returnAt) {
          throw new Error('Mangler sluttidspunkt for hastebytte.')
        }

        const pickupDate = new Date(pickupAt)
        const returnDate = new Date(returnAt)

        if (Number.isNaN(pickupDate.getTime())) {
          throw new Error('Ugyldig hentetidspunkt.')
        }

        if (Number.isNaN(returnDate.getTime())) {
          throw new Error('Ugyldig sluttidspunkt.')
        }

        if (returnDate <= pickupDate) {
          throw new Error('Sluttidspunkt må være etter hentetidspunkt.')
        }

        const meRes = await fetch('/api/customers/me', {
          credentials: 'include',
          cache: 'no-store',
        })

        const meJson = await meRes.json().catch(() => null)

        if (!meRes.ok) {
          throw new Error(meJson?.message || 'Kunne ikke hente innlogget bruker.')
        }

        const meId = meJson?.user?.id || meJson?.id

        if (!meId) {
          throw new Error('Mangler innlogget bruker.')
        }

        const updateOldRes = await fetch(`/api/custody-schedules/${custodyId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endAt: pickupDate.toISOString(),
          }),
        })

        if (!updateOldRes.ok) {
          const raw = await updateOldRes.text()
          throw new Error(raw || 'Kunne ikke oppdatere eksisterende omsorgsperiode.')
        }

        const createNewRes = await fetch('/api/custody-schedules', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child: Number(childId),
            currentParent: Number(meId),
            nextParent: Number(recipientId),
            startAt: pickupDate.toISOString(),
            endAt: returnDate.toISOString(),
            notes: `Hastebytte godkjent.${meta.reason ? ` Begrunnelse: ${meta.reason}` : ''}`,
          }),
        })

        if (!createNewRes.ok) {
          const raw = await createNewRes.text()
          throw new Error(raw || 'Kunne ikke opprette ny omsorgsperiode.')
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
          title: nextStatus === 'approved' ? 'Hastebytte godkjent' : 'Hastebytte avslått',
          message:
            nextStatus === 'approved'
              ? 'Den andre forelderen har godkjent hastebytte.'
              : 'Den andre forelderen har avslått hastebytte.',
          type: 'calendar',
          event: nextStatus === 'approved' ? 'approved' : 'rejected',
          link: '/notifications',
          meta: {
            type: 'custody-emergency-response',
            custodyId: meta.custodyId,
            childId: meta.childId,
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
        throw new Error(raw || 'Kunne ikke svare på forespørselen.')
      }

      setSelectedEmergency(null)
      await loadNotifications()

      if (nextStatus === 'approved') {
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke svare på forespørselen.')
    } finally {
      setActionLoading('')
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead && !item.readAt).length,
    [items],
  )

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>All notifications</h1>
          <p className={styles.subtitle}>
            A full overview of updates across child profiles, posts, calendar, documents, and expenses.
          </p>
        </div>

        <button
          type="button"
          className={styles.markAllBtn}
          onClick={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck size={16} />
          {markingAll ? 'Saving...' : 'Mark all read'}
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total</div>
          <div className={styles.summaryValue}>{items.length}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Unread</div>
          <div className={styles.summaryValue}>{unreadCount}</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.state}>Loading notifications...</div>
      ) : error ? (
        <div className={styles.stateError}>{error}</div>
      ) : items.length === 0 ? (
        <div className={styles.state}>No notifications yet.</div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <button
              key={String(item.id)}
              type="button"
              className={`${styles.item} ${
                !item.isRead && !item.readAt ? styles.unread : styles.read
              }`}
              onClick={() => handleItemClick(item)}
            >
              <div className={styles.iconWrap}>
                <Bell size={18} />
              </div>

              <div className={styles.content}>
                <div className={styles.itemTop}>
                  <div>
                    <div className={styles.itemTitle}>{buildNotificationTitle(item)}</div>
                    <div className={styles.itemMessage}>{buildNotificationMessage(item)}</div>
                  </div>

                  {!item.isRead && !item.readAt ? <span className={styles.dot} /> : null}
                </div>

                <div className={styles.meta}>
                  <span>{getTypeLabel(item.type)}</span>
                  <span>•</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
              </div>

              <ChevronRight size={18} className={styles.arrow} />
            </button>
          ))}
        </div>
      )}

      <div className={styles.backRow}>
        <Link href="/dashboard" className={styles.backLink}>
          Back to dashboard
        </Link>
      </div>
      {selectedEmergency ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setSelectedEmergency(null)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Hastebytte forespurt</h3>
            </div>

            <div className={styles.modalBody}>
              <p>
                <strong>{selectedEmergency.meta?.actorName || 'En forelder'}</strong> ber om
                hastebytte
                {selectedEmergency.meta?.childName
                  ? ` for ${selectedEmergency.meta.childName}`
                  : ''}
                .
              </p>

              {selectedEmergency.meta?.pickupAt ? (
                <p>
                  <strong>Henting:</strong> {formatDateTime(selectedEmergency.meta.pickupAt)}
                </p>
              ) : null}

              {selectedEmergency.meta?.returnAt ? (
                <p>
                  <strong>Varer til:</strong> {formatDateTime(selectedEmergency.meta.returnAt)}
                </p>
              ) : null}

              <p>
                <strong>Begrunnelse:</strong>{' '}
                {selectedEmergency.message ||
                  selectedEmergency.meta?.reason ||
                  'Ingen begrunnelse oppgitt.'}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setSelectedEmergency(null)}
                disabled={!!actionLoading}
              >
                Lukk
              </button>

              <button
                type="button"
                onClick={() => respondEmergencyRequest('rejected')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'rejected' ? 'Sender...' : 'Avslå'}
              </button>

              <button
                type="button"
                onClick={() => respondEmergencyRequest('approved')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'approved' ? 'Sender...' : 'Godta'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}