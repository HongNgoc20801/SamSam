import type { AuditLog } from './auditTypes'
import {
  CheckCircle,
  PlusCircle,
  Upload,
  RefreshCcw,
  Trash2,
  Pencil,
  MessageCircle,
  Heart,
  FileText,
  CalendarDays,
} from 'lucide-react'

type AuditLogListLabels = {
  today: string
  yesterday: string
  noValue: string
  system: string
  unknownUser: string
  activity: string

  created: string
  updated: string
  deleted: string
  uploaded: string
  replaced: string
  confirmed: string
  commented: string
  liked: string
  unliked: string

  entityChild: string
  entityDocument: string
  entityEvent: string
  entityPost: string
  entityEconomy: string
  entityConfirmation: string
  entityOther: string

  fieldFullName: string
  fieldBirthDate: string
  fieldGender: string
  fieldNationalId: string
  fieldStatus: string
  fieldAvatar: string
  fieldTitle: string
  fieldContent: string
  fieldImportant: string
  fieldType: string
  fieldChild: string
  fieldCategory: string
  fieldNoteShort: string
  fieldStartAt: string
  fieldEndAt: string
  fieldNotes: string
  fieldAllDay: string
  fieldFallback: string

  statusAdmin: string
  statusPersonal: string
  statusImportant: string
  statusChild: string

  forChild: string
  fieldsChanged: string
  confirmationReset: string
  childUpdate: string
  generalPost: string

  createdChildProfile: string
  confirmedChildProfile: string
  updatedChildProfile: string

  createdCalendarEvent: string
  updatedCalendarEvent: string
  deletedCalendarEvent: string

  uploadedDocument: string
  replacedDocument: string
  updatedDocument: string
  deletedDocument: string

  createdFamilyPost: string
  updatedFamilyPost: string
  deletedFamilyPost: string

  likedPost: string
  removedLikeFromPost: string
  commentedOnPost: string
  didActivity: string
}

export function fmtDateTime(
  value?: string | null,
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
  empty = '—',
) {
  if (!value) return empty

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  return date.toLocaleString(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function actorDisplayName(a: AuditLog, labels?: Pick<AuditLogListLabels, 'system' | 'unknownUser'>) {
  const raw = String(a?.actorName || '').trim()

  if (raw) {
    if (raw.includes('@')) return raw.split('@')[0]
    return raw
  }

  if (a?.actorType === 'system') return labels?.system || 'System'
  return a?.actorId || labels?.unknownUser || 'Unknown user'
}

export function entityLabel(
  entityType?: string,
  labels?: Pick<
    AuditLogListLabels,
    | 'entityChild'
    | 'entityDocument'
    | 'entityEvent'
    | 'entityPost'
    | 'entityEconomy'
    | 'entityConfirmation'
    | 'entityOther'
    | 'activity'
  >,
) {
  if (entityType === 'child') return labels?.entityChild || 'Child'
  if (entityType === 'document') return labels?.entityDocument || 'Document'
  if (entityType === 'event') return labels?.entityEvent || 'Event'
  if (entityType === 'post') return labels?.entityPost || 'Post'
  if (entityType === 'economy') return labels?.entityEconomy || 'Economy'
  if (entityType === 'confirmation') return labels?.entityConfirmation || 'Confirmation'
  if (entityType === 'other') return labels?.entityOther || 'Other'

  return labels?.activity || 'Activity'
}

export function getActionIcon(action?: string) {
  const a = String(action || '').toLowerCase()

  if (a.startsWith('event.')) return CalendarDays
  if (a.includes('confirm')) return CheckCircle
  if (a.includes('create')) return PlusCircle
  if (a.includes('upload')) return Upload
  if (a.includes('replace')) return RefreshCcw
  if (a.includes('delete')) return Trash2
  if (a.includes('update')) return Pencil
  if (a.includes('comment')) return MessageCircle
  if (a.includes('like')) return Heart

  return FileText
}

export function formatDayLabel(
  dateStr: string,
  labels?: Pick<AuditLogListLabels, 'today' | 'yesterday'>,
) {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return labels?.today || 'Today'
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return labels?.yesterday || 'Yesterday'
  }

  return dateStr
}

export function actionTone(action?: string) {
  const a = String(action || '').toLowerCase()

  if (a.includes('confirm')) return 'confirm'
  if (a.includes('create')) return 'create'
  if (a.includes('upload')) return 'upload'
  if (a.includes('replace')) return 'replace'
  if (a.includes('delete')) return 'delete'
  if (a.includes('update')) return 'update'
  return 'default'
}

export function actionLabel(
  action?: string,
  labels?: Pick<
    AuditLogListLabels,
    'confirmed' | 'created' | 'uploaded' | 'replaced' | 'deleted' | 'updated' | 'activity'
  >,
) {
  const a = String(action || '').toLowerCase()

  if (a.includes('confirm')) return labels?.confirmed || 'Confirmed'
  if (a.includes('create')) return labels?.created || 'Created'
  if (a.includes('upload')) return labels?.uploaded || 'Uploaded'
  if (a.includes('replace')) return labels?.replaced || 'Replaced'
  if (a.includes('delete')) return labels?.deleted || 'Deleted'
  if (a.includes('update')) return labels?.updated || 'Updated'

  return labels?.activity || 'Activity'
}

export function fieldLabel(
  field?: string,
  labels?: Pick<
    AuditLogListLabels,
    | 'fieldFullName'
    | 'fieldBirthDate'
    | 'fieldGender'
    | 'fieldNationalId'
    | 'fieldStatus'
    | 'fieldAvatar'
    | 'fieldTitle'
    | 'fieldContent'
    | 'fieldImportant'
    | 'fieldType'
    | 'fieldChild'
    | 'fieldCategory'
    | 'fieldNoteShort'
    | 'fieldStartAt'
    | 'fieldEndAt'
    | 'fieldNotes'
    | 'fieldAllDay'
    | 'fieldFallback'
  >,
) {
  const map: Record<string, string> = {
    fullName: labels?.fieldFullName || 'Full name',
    birthDate: labels?.fieldBirthDate || 'Birth date',
    gender: labels?.fieldGender || 'Gender',
    nationalId: labels?.fieldNationalId || 'National ID',
    status: labels?.fieldStatus || 'Status',
    avatar: labels?.fieldAvatar || 'Avatar',
    title: labels?.fieldTitle || 'Title',
    content: labels?.fieldContent || 'Content',
    important: labels?.fieldImportant || 'Important',
    type: labels?.fieldType || 'Type',
    child: labels?.fieldChild || 'Child',
    category: labels?.fieldCategory || 'Category',
    noteShort: labels?.fieldNoteShort || 'Short note',
    startAt: labels?.fieldStartAt || 'Start time',
    endAt: labels?.fieldEndAt || 'End time',
    notes: labels?.fieldNotes || 'Notes',
    allDay: labels?.fieldAllDay || 'All day',
  }

  return map[field || ''] || field || labels?.fieldFallback || 'Field'
}

export function renderChangeValue(v?: string, empty = '—') {
  const value = String(v ?? '').trim()
  if (!value) return empty
  if (value.length > 120) return `${value.slice(0, 120)}…`
  return value
}

function getChildName(a: AuditLog) {
  const metaChildName = String(a?.meta?.childName || '').trim()
  if (metaChildName) return metaChildName

  const snapshot = String(a?.childNameSnapshot || '').trim()
  if (snapshot) return snapshot

  const child = a?.child
  if (child && typeof child === 'object') {
    const fullName = String(child?.fullName || child?.name || '').trim()
    if (fullName) return fullName
  }

  return ''
}

function statusLabel(
  status?: string,
  labels?: Pick<
    AuditLogListLabels,
    'statusAdmin' | 'statusPersonal' | 'statusImportant' | 'statusChild'
  >,
) {
  const s = String(status || '').toLowerCase()

  if (!s) return ''
  if (s === 'admin') return labels?.statusAdmin || 'Admin'
  if (s === 'personal') return labels?.statusPersonal || 'Personal'
  if (s === 'important') return labels?.statusImportant || 'Important'
  if (s === 'child') return labels?.statusChild || 'Child'

  return status || ''
}

export function getAuditTarget(a: AuditLog) {
  const meta = a.meta || {}

  if (meta.documentTitle) return meta.documentTitle
  if (meta.childName && a.entityType === 'child') return meta.childName
  if (meta.title) return meta.title

  return a.entityId ? `#${a.entityId}` : ''
}

function buildEventSub(meta: any, a: AuditLog, labels?: AuditLogListLabels, changesCount = 0) {
  const childName = getChildName(a)
  const parts: string[] = []

  if (childName) parts.push(`${labels?.forChild || 'for'} ${childName}`)

  if (meta?.startAt && meta?.endAt) {
    parts.push(`${fmtDateTime(meta.startAt)} → ${fmtDateTime(meta.endAt)}`)
  }

  const currentStatus = statusLabel(meta?.status, labels)
  const previousStatus = statusLabel(meta?.previousStatus, labels)

  if (currentStatus && previousStatus && currentStatus !== previousStatus) {
    parts.push(`${previousStatus} → ${currentStatus}`)
  } else if (currentStatus) {
    parts.push(currentStatus)
  }

  if (!parts.length && changesCount > 0) {
    parts.push(`${changesCount} ${labels?.fieldsChanged || 'fields changed'}`)
  }

  return parts.join(' • ')
}

function buildDocumentSub(a: AuditLog, fallback?: string, labels?: AuditLogListLabels) {
  const childName = getChildName(a)
  const parts: string[] = []

  if (childName) parts.push(`${labels?.forChild || 'for'} ${childName}`)
  if (fallback) parts.push(fallback)

  return parts.join(' • ')
}

function buildPostSentence(
  base: 'created' | 'updated' | 'deleted',
  meta: any,
  labels?: AuditLogListLabels,
) {
  const isChildUpdate = meta?.type === 'child-update'
  const childName = String(meta?.childName || '').trim()

  if (isChildUpdate) {
    return `${base === 'created'
      ? labels?.created || 'Created'
      : base === 'updated'
      ? labels?.updated || 'Updated'
      : labels?.deleted || 'Deleted'} ${labels?.childUpdate || 'child update'}${
      childName ? ` ${labels?.forChild || 'for'} ${childName}` : ''
    }`
  }

  return `${
    base === 'created'
      ? labels?.created || 'Created'
      : base === 'updated'
      ? labels?.updated || 'Updated'
      : labels?.deleted || 'Deleted'
  } ${labels?.generalPost || 'family post'}`
}

export function auditPretty(a: AuditLog, labels?: AuditLogListLabels) {
  const action = String(a.action || '').toLowerCase()
  const meta = a.meta || {}
  const changes = Array.isArray(a.changes) ? a.changes : []

  if (action === 'child.create') {
    return {
      sentence: labels?.createdChildProfile || 'created a child profile',
      target: meta?.childName || '',
      sub: '',
    }
  }

  if (action === 'child.confirm') {
    return {
      sentence: labels?.confirmedChildProfile || 'confirmed child profile',
      target: meta?.childName || '',
      sub: '',
    }
  }

  if (action === 'child.update') {
    return {
      sentence: labels?.updatedChildProfile || 'updated child profile',
      target: meta?.childName || '',
      sub: meta?.wasResetToPending
        ? labels?.confirmationReset || 'Confirmation reset because important information changed'
        : `${changes.length} ${labels?.fieldsChanged || 'fields changed'}`,
    }
  }

  if (action === 'event.create') {
    return {
      sentence: labels?.createdCalendarEvent || 'created calendar event',
      target: meta?.title || '',
      sub: buildEventSub(meta, a, labels),
    }
  }

  if (action === 'event.update') {
    return {
      sentence: labels?.updatedCalendarEvent || 'updated calendar event',
      target: meta?.title || '',
      sub: buildEventSub(meta, a, labels, changes.length),
    }
  }

  if (action === 'event.delete') {
    return {
      sentence: labels?.deletedCalendarEvent || 'deleted calendar event',
      target: meta?.title || '',
      sub: buildEventSub(meta, a, labels),
    }
  }

  if (action === 'doc.upload') {
    return {
      sentence: labels?.uploadedDocument || 'uploaded document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${meta.documentCategory} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
        labels,
      ),
    }
  }

  if (action === 'doc.replace') {
    return {
      sentence: labels?.replacedDocument || 'replaced document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${meta.documentCategory} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
        labels,
      ),
    }
  }

  if (action === 'doc.update') {
    return {
      sentence: labels?.updatedDocument || 'updated document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        changes.length > 0
          ? `${changes.length} ${labels?.fieldsChanged || 'fields changed'}`
          : `v${meta?.version ?? 1}`,
        labels,
      ),
    }
  }

  if (action === 'doc.delete') {
    return {
      sentence: labels?.deletedDocument || 'deleted document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${meta.documentCategory} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
        labels,
      ),
    }
  }

  if (action === 'post.create') {
    return {
      sentence: buildPostSentence('created', meta, labels),
      target: meta?.title || '',
      sub: meta?.type === 'child-update'
        ? labels?.childUpdate || 'Child update'
        : labels?.generalPost || 'General post',
    }
  }

  if (action === 'post.update') {
    return {
      sentence: buildPostSentence('updated', meta, labels),
      target: meta?.title || '',
      sub: `${changes.length} ${labels?.fieldsChanged || 'fields changed'}`,
    }
  }

  if (action === 'post.delete') {
    return {
      sentence: buildPostSentence('deleted', meta, labels),
      target: meta?.title || '',
      sub: meta?.type === 'child-update'
        ? labels?.childUpdate || 'Child update'
        : labels?.generalPost || 'General post',
    }
  }

  if (action === 'post.like') {
    return {
      sentence: labels?.likedPost || 'liked post',
      target: meta?.title || '',
      sub: '',
    }
  }

  if (action === 'post.unlike') {
    return {
      sentence: labels?.removedLikeFromPost || 'removed like from post',
      target: meta?.title || '',
      sub: '',
    }
  }

  if (action === 'post.comment.create') {
    return {
      sentence: labels?.commentedOnPost || 'commented on post',
      target: meta?.title || '',
      sub: '',
    }
  }

  return {
    sentence: a.summary || a.action || labels?.didActivity || 'did an activity',
    target: getAuditTarget(a),
    sub: '',
  }
}

export function isImportantAudit(a: AuditLog) {
  if (a.severity) {
    return a.severity === 'important' || a.severity === 'critical'
  }

  const action = String(a.action || '').toLowerCase()

  if (
    action === 'post.like' ||
    action === 'post.unlike' ||
    action === 'post.comment.create'
  ) {
    return false
  }

  return true
}

export function groupAuditLogsByDay(audits: AuditLog[]) {
  const groups = new Map<string, AuditLog[]>()

  for (const audit of audits) {
    const key = audit.createdAt ? audit.createdAt.slice(0, 10) : 'Unknown'
    const existing = groups.get(key) || []
    existing.push(audit)
    groups.set(key, existing)
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
  }))
}