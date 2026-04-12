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

function getRelName(v: any) {
  if (!v || typeof v !== 'object') return ''
  return v.fullName || v.name || ''
}

export async function getDashboardData() {
  const res = await fetch('/api/calendar-events?limit=100&sort=startAt&depth=1', {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Failed to load dashboard data')
  }

  const data = await res.json()
  const docs: DashboardEvent[] = data?.docs ?? []
  const now = new Date()

  const upcoming = docs
    .filter((event) => new Date(event.endAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  const upcomingHandover =
    upcoming.find((event) => event.eventType === 'handover') ?? null

  const pendingConfirmations = upcoming.filter(
    (event) => event.requiresConfirmation && event.confirmationStatus === 'pending',
  )

  const upcomingEvents = upcoming.slice(0, 5)

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
        }
      : null,
    pendingConfirmations: pendingConfirmations.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      childName: getRelName(event.child),
      confirmationStatus: event.confirmationStatus || 'pending',
      eventType: event.eventType || 'other',
    })),
    upcomingEvents: upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      childName: getRelName(event.child),
      eventType: event.eventType || 'other',
      location: event.location || '',
    })),
  }
}