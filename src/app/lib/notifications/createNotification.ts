function normalizeRelId(v: any): string | number | null {
  if (v === null || v === undefined || v === '') return null

  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  if (typeof v === 'object' && v?.id !== undefined && v?.id !== null) {
    return normalizeRelId(v.id)
  }

  return null
}

export type NotificationType =
  | 'calendar'
  | 'expense'
  | 'request'
  | 'bank'
  | 'status'
  | 'documents'
  | 'post'

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

export async function createNotification(
  req: any,
  input: {
    recipient: string | number
    family?: string | number | null
    child?: string | number | null
    type: NotificationType
    event: NotificationEventType
    title: string
    message?: string
    link?: string
    meta?: any
  },
) {
  try {
    await req.payload.create({
      collection: 'notifications',
      data: {
        recipient: normalizeRelId(input.recipient),
        family: normalizeRelId(input.family),
        child: normalizeRelId(input.child),
        type: input.type,
        event: input.event,
        title: String(input.title || '').trim() || 'Notification',
        message: String(input.message || '').trim(),
        link: String(input.link || '').trim(),
        isRead: false,
        readAt: null,
        meta: input.meta ?? {},
      },
      req,
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[createNotification] failed', err)
  }
}