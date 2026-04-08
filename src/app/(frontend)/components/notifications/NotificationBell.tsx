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
      const res = await fetch('/api/notifications/me', {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setItems([])
        return
      }
      const docs = Array.isArray(data?.docs) ? data.docs : []
      setItems(docs.slice(0, 8))
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

      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  async function onClickNotification(item: NotificationItem) {
    if (!item.isRead) {
      await markOneAsRead(item.id)
      setItems((prev) =>
        prev.map((x) => (String(x.id) === String(item.id) ? { ...x, isRead: true } : x)),
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
      if (!wrapRef.current.contains(target)) setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div className={bellStyles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={bellStyles.trigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className={bellStyles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
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