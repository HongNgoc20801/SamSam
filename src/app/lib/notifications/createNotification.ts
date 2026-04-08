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

export async function createNotification(
  req: any,
  input: {
    recipient: string | number
    family?: string | number | null
    child?: string | number | null
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
        title: input.title,
        message: input.message || '',
        link: input.link || '',
        isRead: false,
        meta: input.meta ?? {},
      },
      req,
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[createNotification] failed', err)
  }
}