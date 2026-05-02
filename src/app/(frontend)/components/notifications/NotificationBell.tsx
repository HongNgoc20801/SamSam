'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import bellStyles from './notificationBell.module.css'
import NotificationDropdown, { NotificationItem } from './NotificationDropdown'

function BellIcon() {
  return (
    <svg
      className={bellStyles.notificationBellIcon}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 17H9m10-1V11a7 7 0 1 0-14 0v5l-2 2h18l-2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
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

function getCustomerName(customer: any) {
  if (!customer) return ''

  return (
    customer?.fullName ||
    `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
    customer?.email ||
    ''
  )
}

function getCustomerAvatar(customer: any) {
  if (!customer) return ''

  return (
    getMediaUrl(customer?.avatar) ||
    getMediaUrl(customer?.profileImage) ||
    getMediaUrl(customer?.image)
  )
}

export default function NotificationBell() {
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  async function loadUnreadCount() {
    try {
      const res = await fetch('/api/notifications/me/unread-count', {
        credentials: 'include',
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) return

      setUnreadCount(Number(data?.count ?? 0))
    } catch {}
  }

  async function loadNotifications() {
    setLoading(true)

    try {
      const [notificationsRes, customersRes] = await Promise.all([
        fetch('/api/notifications/me?limit=8&sort=-createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }),

        fetch('/api/customers?limit=200&sort=createdAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
      ])

      const notificationsJson = await notificationsRes.json().catch(() => null)
      const customersJson = customersRes ? await customersRes.json().catch(() => null) : null

      if (!notificationsRes.ok) {
        setItems([])
        return
      }

      const docs = Array.isArray(notificationsJson?.docs) ? notificationsJson.docs : []
      const customers = Array.isArray(customersJson?.docs) ? customersJson.docs : []

      const customerById = new Map<string, any>()

      customers.forEach((customer: any) => {
        if (customer?.id != null) {
          customerById.set(String(customer.id), customer)
        }
      })

      const mappedDocs = docs.slice(0, 8).map((item: any) => {
        const meta = item.meta || {}

        const actorId = meta.actorId ? String(meta.actorId) : ''
        const actorNameFromMeta = String(meta.actorName || '').trim().toLowerCase()

        const actorFromId = actorId ? customerById.get(actorId) : null

        const actorFromName =
          !actorFromId && actorNameFromMeta
            ? customers.find((customer: any) => {
                return getCustomerName(customer).trim().toLowerCase() === actorNameFromMeta
              })
            : null

        const actor = actorFromId || actorFromName || null

        const actorName = meta.actorName || getCustomerName(actor)
        const actorAvatarUrl = meta.actorAvatarUrl || getCustomerAvatar(actor)

        return {
          ...item,
          isRead: Boolean(item.isRead || item.readAt),
          type: item.type || 'status',
          event: item.event || 'updated',
          meta: {
            ...meta,
            actorName,
            actorAvatarUrl,
          },
        }
      })

      setItems(mappedDocs)
    } catch {
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
    } catch {}
  }

  async function markAllAsRead() {
    if (markingAll) return

    setMarkingAll(true)

    try {
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

      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  async function onClickNotification(item: NotificationItem) {
    if (!item.isRead && !item.readAt) {
      await markOneAsRead(item.id)

      setItems((prev) =>
        prev.map((x) =>
          String(x.id) === String(item.id)
            ? { ...x, isRead: true, readAt: new Date().toISOString() }
            : x,
        ),
      )

      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    setOpen(false)

    if (item.link) {
      router.push(item.link)
    }
  }

  useEffect(() => {
    loadUnreadCount()
  }, [])

  useEffect(() => {
    if (!open) return

    loadNotifications()
    loadUnreadCount()
  }, [open])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node | null

      if (!wrapRef.current || !target) return

      if (!wrapRef.current.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)

    return () => {
      document.removeEventListener('mousedown', handleOutside)
    }
  }, [])

  return (
    <div className={bellStyles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${bellStyles.trigger} ${open ? bellStyles.triggerActive : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <BellIcon />

        {unreadCount > 0 ? (
          <span className={bellStyles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        ) : null}
      </button>

      <NotificationDropdown
        open={open}
        loading={loading}
        markingAll={markingAll}
        unreadCount={unreadCount}
        items={items}
        onMarkAll={markAllAsRead}
        onItemClick={onClickNotification}
        onViewAll={() => {
          setOpen(false)
          router.push('/notifications')
        }}
      />
    </div>
  )
}