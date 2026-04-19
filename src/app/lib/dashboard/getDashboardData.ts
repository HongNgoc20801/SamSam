type DashboardEvent = {
  id: string | number
  title: string
  startAt: string
  endAt: string
  eventType?: string
  priority?: string
  location?: string
  requiresConfirmation?: boolean
  confirmationStatus?: string
  child?: { id: string | number; fullName?: string } | string | number
  handoverFrom?: { id: string | number; fullName?: string } | string | number
  handoverTo?: { id: string | number; fullName?: string } | string | number
}

type NotificationDoc = {
  id: string | number
  title?: string
  message?: string
  createdAt?: string
  read?: boolean
  link?: string
  type?: string
  event?: string
}

function getRelName(v: any) {
  if (!v || typeof v !== 'object') return ''
  return v.fullName || v.name || ''
}

function isFutureOrOngoing(endAt?: string) {
  if (!endAt) return false
  return new Date(endAt).getTime() >= Date.now()
}

export async function getDashboardData() {
  const [eventsRes, notificationsRes] = await Promise.all([
    fetch('/api/calendar-events?limit=100&sort=startAt&depth=1', {
      credentials: 'include',
      cache: 'no-store',
    }),
    fetch('/api/notifications?limit=8&sort=-createdAt', {
      credentials: 'include',
      cache: 'no-store',
    }),
  ])

  if (!eventsRes.ok) {
    throw new Error('Failed to load dashboard data')
  }

  const eventsJson = await eventsRes.json()
  const notificationsJson = notificationsRes.ok ? await notificationsRes.json() : { docs: [] }

  const docs: DashboardEvent[] = eventsJson?.docs ?? []
  const notifications: NotificationDoc[] = notificationsJson?.docs ?? []

  const upcoming = docs
    .filter((event) => isFutureOrOngoing(event.endAt))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  const upcomingHandover =
    upcoming.find((event) => event.eventType === 'handover') ?? null

  const pendingConfirmations = upcoming.filter(
    (event) => event.requiresConfirmation && event.confirmationStatus === 'pending',
  )

  const upcomingEvents = upcoming.slice(0, 6)

  return {
    upcomingHandover: upcomingHandover
      ? {
          id: upcomingHandover.id,
          title: upcomingHandover.title,
          startAt: upcomingHandover.startAt,
          endAt: upcomingHandover.endAt,
          location: upcomingHandover.location || '',
          childName: getRelName(upcomingHandover.child),
          handoverFromName: getRelName(upcomingHandover.handoverFrom),
          handoverToName: getRelName(upcomingHandover.handoverTo),
          confirmationStatus: upcomingHandover.confirmationStatus || 'not-required',
          requiresConfirmation: !!upcomingHandover.requiresConfirmation,
        }
      : null,
    pendingConfirmations: pendingConfirmations.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      childName: getRelName(event.child),
      confirmationStatus: event.confirmationStatus || 'pending',
      eventType: event.eventType || 'other',
      location: event.location || '',
    })),
    upcomingEvents: upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      childName: getRelName(event.child),
      eventType: event.eventType || 'other',
      location: event.location || '',
      confirmationStatus: event.confirmationStatus || 'not-required',
    })),
    notifications,
  }
}