function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return typeof u.family === 'string' ? u.family : u.family?.id ?? null
}

function getCollectionSlug(req: any) {
  return req?.user?.collection ?? req?.user?._collection
}

function getActorType(req: any): 'customer' | 'admin' | 'system' {
  const slug = getCollectionSlug(req)
  if (slug === 'users') return 'admin'
  if (slug === 'customers') return 'customer'
  return 'system'
}

function getActorName(req: any) {
  const u: any = req?.user
  if (!u) return 'System'
  return u.fullName || u.name || u.email || String(u.id)
}

function toText(v: any, max = 300) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.slice(0, max)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).slice(0, max)
  try {
    return JSON.stringify(v).slice(0, max)
  } catch {
    return String(v).slice(0, max)
  }
}

export async function logAudit(
  req: any,
  input: {
    familyId?: string | number | null
    childId?: string | number | null
    action: string
    entityType: 'child' | 'document' | 'event' | 'other'
    entityId?: string | null
    summary?: string
    changes?: Array<{ field: string; from?: any; to?: any }>
    meta?: any
  },
) {
  try {
    const userId = (req?.user as any)?.id ?? null
    const familyId = input.familyId ?? getFamilyIdFromUser(req)

    if (!familyId) {
      console.error('[logAudit] missing familyId', { user: req?.user, input })
      return
    }

    const normalizedChanges =
      Array.isArray(input.changes) && input.changes.length
        ? input.changes.map((c) => ({
            field: c.field,
            from: toText(c.from),
            to: toText(c.to),
          }))
        : undefined

    const normalizedMeta = {
      ...(input.meta ?? {}),
      changedFields: normalizedChanges?.map((c) => c.field) ?? input?.meta?.changedFields ?? [],
    }

    const payloadData = {
      family: familyId,
      child: input.childId ?? undefined,
      actorId: userId ? String(userId) : undefined,
      actorType: getActorType(req),
      actorName: getActorName(req),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || undefined,
      summary: input.summary || undefined,
      changes: normalizedChanges,
      meta: normalizedMeta,
    }

    const created = await req.payload.create({
      collection: 'audit_logs',
      data: payloadData,
      req,
      overrideAccess: true,
    })

    console.log('[logAudit] created OK:', {
      id: created?.id,
      action: created?.action,
      child: created?.child,
    })
  } catch (err) {
    console.error('[logAudit] failed:', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      user: req?.user,
      input,
    })
  }
}