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

export function fmtDateTime(v?: string | null) {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
export function actorDisplayName(a: AuditLog) {
  const raw = String(a?.actorName || '').trim()

  if (raw) {
    if (raw.includes('@')) return raw.split('@')[0]
    return raw
  }

  if (a?.actorType === 'system') return 'System'
  return a?.actorId || 'Unknown user'
}

export function entityLabel(entityType?: string) {
  if (entityType === 'child') return 'Child'
  if (entityType === 'document') return 'Document'
  if (entityType === 'event') return 'Event'
  if (entityType === 'post') return 'Post'
  return 'Activity'
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

export function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr

  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'

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

export function actionLabel(action?: string) {
  const a = String(action || '').toLowerCase()

  if (a.includes('confirm')) return 'Confirmed'
  if (a.includes('create')) return 'Created'
  if (a.includes('upload')) return 'Uploaded'
  if (a.includes('replace')) return 'Replaced'
  if (a.includes('delete')) return 'Deleted'
  if (a.includes('update')) return 'Updated'
  return 'Activity'
}

export function fieldLabel(field?: string) {
  const map: Record<string, string> = {
    fullName: 'Full name',
    birthDate: 'Birth date',
    gender: 'Gender',
    nationalId: 'National ID',
    status: 'Status',
    avatar: 'Avatar',

    title: 'Title',
    content: 'Content',
    important: 'Important',
    type: 'Type',
    child: 'Child',

    category: 'Category',
    noteShort: 'Short note',

    startAt: 'Start time',
    endAt: 'End time',
    notes: 'Notes',
    allDay: 'All day',
  }

  return map[field || ''] || field || 'Field'
}

export function renderChangeValue(v?: string) {
  const value = String(v ?? '').trim()
  if (!value) return '—'
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

function statusLabel(status?: string) {
  const s = String(status || '').toLowerCase()

  if (!s) return ''
  if (s === 'admin') return 'Admin'
  if (s === 'personal') return 'Personal'
  if (s === 'important') return 'Important'
  if (s === 'child') return 'Child'

  return status || ''
}

export function getAuditTarget(a: AuditLog) {
  const meta = a.meta || {}

  if (meta.documentTitle) return meta.documentTitle
  if (meta.childName && a.entityType === 'child') return meta.childName
  if (meta.title) return meta.title

  return a.entityId ? `#${a.entityId}` : ''
}

function buildEventSub(meta: any, a: AuditLog, changesCount = 0) {
  const childName = getChildName(a)
  const parts: string[] = []

  if (childName) parts.push(`for ${childName}`)

  if (meta?.startAt && meta?.endAt) {
    parts.push(`${fmtDateTime(meta.startAt)} → ${fmtDateTime(meta.endAt)}`)
  }

  const st = statusLabel(meta?.status)
  const prev = statusLabel(meta?.previousStatus)

  if (st && prev && st !== prev) {
    parts.push(`${prev} → ${st}`)
  } else if (st) {
    parts.push(st)
  }

  if (!parts.length && changesCount > 0) {
    parts.push(`${changesCount} field(s) changed`)
  }

  return parts.join(' • ')
}

function buildDocumentSub(a: AuditLog, fallback?: string) {
  const childName = getChildName(a)
  const parts: string[] = []

  if (childName) parts.push(`for ${childName}`)
  if (fallback) parts.push(fallback)

  return parts.join(' • ')
}

function buildPostSentence(base: 'created' | 'updated' | 'deleted', meta: any) {
  const isChildUpdate = meta?.type === 'child-update'
  const childName = String(meta?.childName || '').trim()

  if (isChildUpdate) {
    return `${base} child update${childName ? ` for ${childName}` : ''}`
  }

  return `${base} family post`
}

export function auditPretty(a: AuditLog) {
  const action = String(a.action || '').toLowerCase()
  const meta = a.meta || {}
  const changes = Array.isArray(a.changes) ? a.changes : []

  if (action === 'child.create') {
    return { sentence: 'created a child profile', target: meta?.childName || '', sub: '' }
  }

  if (action === 'child.confirm') {
    return { sentence: 'confirmed child profile', target: meta?.childName || '', sub: '' }
  }

  if (action === 'child.update') {
    return {
      sentence: 'updated child profile',
      target: meta?.childName || '',
      sub: meta?.wasResetToPending
        ? 'Confirmation reset because important information changed'
        : `${changes.length} field(s) changed`,
    }
  }

  if (action === 'event.create') {
    return {
      sentence: 'created calendar event',
      target: meta?.title || '',
      sub: buildEventSub(meta, a),
    }
  }

  if (action === 'event.update') {
    return {
      sentence: 'updated calendar event',
      target: meta?.title || '',
      sub: buildEventSub(meta, a, changes.length),
    }
  }

  if (action === 'event.delete') {
    return {
      sentence: 'deleted calendar event',
      target: meta?.title || '',
      sub: buildEventSub(meta, a),
    }
  }

  if (action === 'doc.upload') {
    return {
      sentence: 'uploaded document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${meta.documentCategory} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
      ),
    }
  }

  if (action === 'doc.replace') {
    return {
      sentence: 'replaced document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${meta.documentCategory} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
      ),
    }
  }

  if (action === 'doc.update') {
    return {
      sentence: 'updated document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        changes.length > 0 ? `${changes.length} field(s) changed` : `v${meta?.version ?? 1}`,
      ),
    }
  }

  if (action === 'doc.delete') {
    return {
      sentence: 'deleted document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${meta.documentCategory} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
      ),
    }
  }

  if (action === 'post.create') {
    return {
      sentence: buildPostSentence('created', meta),
      target: meta?.title || '',
      sub: meta?.type === 'child-update' ? 'Child update' : 'General post',
    }
  }

  if (action === 'post.update') {
    return {
      sentence: buildPostSentence('updated', meta),
      target: meta?.title || '',
      sub: `${changes.length} field(s) changed`,
    }
  }

  if (action === 'post.delete') {
    return {
      sentence: buildPostSentence('deleted', meta),
      target: meta?.title || '',
      sub: meta?.type === 'child-update' ? 'Child update' : 'General post',
    }
  }

  if (action === 'post.like') {
    return {
      sentence: 'liked post',
      target: meta?.title || '',
      sub: '',
    }
  }

  if (action === 'post.unlike') {
    return {
      sentence: 'removed like from post',
      target: meta?.title || '',
      sub: '',
    }
  }

  if (action === 'post.comment.create') {
    return {
      sentence: 'commented on post',
      target: meta?.title || '',
      sub: '',
    }
  }

  return {
    sentence: a.summary || a.action || 'did an activity',
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

  for (const a of audits) {
    const key = a.createdAt ? a.createdAt.slice(0, 10) : 'Unknown'
    const existing = groups.get(key) || []
    existing.push(a)
    groups.set(key, existing)
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
  }))
}