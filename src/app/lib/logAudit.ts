type AuditActorRole = 'mother' | 'father' | 'parent' | 'admin' | 'system'
type AuditRelatedRole = 'mother' | 'father' | 'both' | 'child' | 'system'
type AuditEntityType =
  | 'child'
  | 'document'
  | 'event'
  | 'post'
  | 'economy'
  | 'confirmation'
  | 'other'
type AuditScope =
  | 'calendar'
  | 'economy'
  | 'documents'
  | 'child_profile'
  | 'confirmation'
  | 'system'
  | 'other'
type AuditSeverity = 'info' | 'important' | 'critical'

function getCollectionSlug(req: any) {
  return req?.user?.collection ?? req?.user?._collection
}

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

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return normalizeRelId(u.family)
}

function getActorType(req: any): 'customer' | 'admin' | 'system' {
  const slug = getCollectionSlug(req)
  if (slug === 'users') return 'admin'
  if (slug === 'customers') return 'customer'
  return 'system'
}

function getActorDisplayName(req: any) {
  const u: any = req?.user
  if (!u) return 'System'

  const full =
    `${String(u?.firstName ?? u?.fornavn ?? '').trim()} ${String(
      u?.lastName ?? u?.etternavn ?? '',
    ).trim()}`.trim()

  if (full) return full

  const fallback =
    String(u?.fullName ?? u?.name ?? '').trim() ||
    String(u?.email ?? '').trim() ||
    String(u?.id ?? 'System')

  return fallback
}

function getActorRole(req: any): AuditActorRole {
  const u: any = req?.user
  if (!u) return 'system'
  if (getCollectionSlug(req) === 'users') return 'admin'

  const role = String(u?.parentRole ?? u?.role ?? '').toLowerCase()
  if (role === 'mother') return 'mother'
  if (role === 'father') return 'father'
  return 'parent'
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
    childName?: string
    action: string
    entityType: AuditEntityType
    entityId?: string | null
    actorRole?: AuditActorRole
    relatedToRole?: AuditRelatedRole
    scope?: AuditScope
    severity?: AuditSeverity
    targetLabel?: string
    summary?: string
    visibleInFamilyTimeline?: boolean
    changes?: Array<{ field: string; from?: any; to?: any }>
    meta?: any
  },
) {
  try {
    const userId = (req?.user as any)?.id ?? null
    const familyId = input.familyId ?? getFamilyIdFromUser(req)

    if (!familyId) return

    const actorName = getActorDisplayName(req)

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
      actorName,
      changedFields:
        normalizedChanges?.map((c) => c.field) ?? input?.meta?.changedFields ?? [],
    }

    await req.payload.create({
      collection: 'audit_logs',
      data: {
        family: familyId,
        child: input.childId ?? undefined,
        childNameSnapshot: input.childName || normalizedMeta?.childName || undefined,
        actorId: userId ? String(userId) : undefined,
        actorType: getActorType(req),
        actorRole: input.actorRole ?? getActorRole(req),
        relatedToRole: input.relatedToRole ?? 'both',
        actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || undefined,
        scope: input.scope ?? 'other',
        severity: input.severity ?? 'info',
        visibleInFamilyTimeline: input.visibleInFamilyTimeline ?? true,
        targetLabel: input.targetLabel || undefined,
        summary: input.summary || undefined,
        changes: normalizedChanges,
        meta: normalizedMeta,
      },
      req,
      overrideAccess: true,
    })
  } catch (err) {
    console.error('[logAudit] failed', err)
  }
}