export type AuditActorType = 'customer' | 'admin' | 'system'

export type AuditActorRole =
  | 'mother'
  | 'father'
  | 'parent'
  | 'admin'
  | 'system'

export type AuditRelatedRole =
  | 'mother'
  | 'father'
  | 'both'
  | 'child'
  | 'system'

export type AuditEntityType =
  | 'child'
  | 'document'
  | 'event'
  | 'post'
  | 'economy'
  | 'confirmation'
  | 'other'

export type AuditScope =
  | 'calendar'
  | 'economy'
  | 'documents'
  | 'child_profile'
  | 'confirmation'
  | 'system'
  | 'other'

export type AuditSeverity = 'info' | 'important' | 'critical'

export type AuditMeta = {
  childId?: string | number
  childName?: string

  documentTitle?: string
  documentCategory?: string
  version?: number
  fileName?: string
  replaces?: string | number | null

  status?: string
  previousStatus?: string
  wasResetToPending?: boolean
  changedFields?: string[]

  type?: string
  important?: boolean
  title?: string
  isChildUpdate?: boolean
  audienceLabel?: string

  startAt?: string
  endAt?: string
  notes?: string
  allDay?: boolean

  amount?: number | string
  currency?: string

  [key: string]: any
}

export type AuditChange = {
  field: string
  from?: string
  to?: string
}

export type AuditLog = {
  id: string
  action: string
  createdAt?: string

  actorId?: string
  actorName?: string
  actorType?: AuditActorType
  actorRole?: AuditActorRole
  relatedToRole?: AuditRelatedRole

  summary?: string

  entityType?: AuditEntityType
  scope?: AuditScope
  severity?: AuditSeverity

  visibleInFamilyTimeline?: boolean

  entityId?: string
  targetLabel?: string

  changes?: AuditChange[]
  meta?: AuditMeta

  childNameSnapshot?: string
  child?: string | number | { id?: string | number; fullName?: string; name?: string }
}