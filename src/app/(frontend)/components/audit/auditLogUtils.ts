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
  Wallet,
  Landmark,
} from 'lucide-react'

export type AuditLogListLabels = {
  today: string
  yesterday: string
  noValue: string
  system: string
  unknownUser: string
  activity: string

  yesLabel: string
  noLabel: string

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

  fieldAmount: string
  fieldCurrency: string
  fieldTransactionDate: string
  fieldPaidBy: string
  fieldPaidFromScope: string
  fieldStatusReason: string
  fieldPaidAt: string
  fieldPaidByName: string
  fieldReviewedAt: string
  fieldReviewedByName: string
  fieldBankName: string
  fieldConnectionScope: string
  fieldFromScope: string
  fieldToScope: string
  fieldLocation: string
  fieldDecisionNote: string

  fieldCategoryAgreement: string
  fieldCategorySchool: string
  fieldCategoryHealth: string
  fieldCategoryId: string
  fieldCategoryOther: string

  statusAdmin: string
  statusPersonal: string
  statusImportant: string
  statusChild: string

  forChild: string
  fromLabel: string
  bankLabel: string
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

  createdPaymentItem: string
  updatedPaymentItem: string
  deletedPaymentItem: string
  paidPaymentItem: string

  createdMoneyRequest: string
  approvedMoneyRequest: string
  rejectedMoneyRequest: string

  transferredMoney: string
  connectedBank: string
  disconnectedBank: string

  didActivity: string
  viewDetails: string
  hideDetails: string
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

export function fmtDateOnly(
  value?: string | null,
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
  empty = '—',
) {
  if (!value) return empty

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  return date.toLocaleDateString(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function fmtTimeOnly(
  value?: string | null,
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
  empty = '—',
) {
  if (!value) return empty

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return empty

  return date.toLocaleTimeString(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getDateKey(value?: string | null, timeZone = 'Europe/Oslo') {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function actorDisplayName(
  a: AuditLog,
  labels?: Pick<AuditLogListLabels, 'system' | 'unknownUser'>,
) {
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
  if (a.startsWith('economy.')) return Wallet
  if (a.startsWith('bank.')) return Landmark
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
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
) {
  if (!dateStr) return ''

  const date = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr

  const now = new Date()
  const currentKey = getDateKey(now.toISOString(), timeZone)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday.toISOString(), timeZone)

  const dateKey = getDateKey(date.toISOString(), timeZone)

  if (dateKey === currentKey) {
    return labels?.today || 'Today'
  }

  if (dateKey === yesterdayKey) {
    return labels?.yesterday || 'Yesterday'
  }

  return date.toLocaleDateString(locale, {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function actionTone(action?: string) {
  const a = String(action || '').toLowerCase()

  if (a.includes('confirm') || a.includes('approve') || a.includes('pay')) return 'confirm'
  if (a.includes('create')) return 'create'
  if (a.includes('upload')) return 'upload'
  if (a.includes('replace')) return 'replace'
  if (a.includes('delete') || a.includes('reject')) return 'delete'
  if (a.includes('update') || a.includes('transfer') || a.includes('connect')) return 'update'
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

  if (a.includes('confirm') || a.includes('approve') || a.includes('pay')) {
    return labels?.confirmed || 'Confirmed'
  }
  if (a.includes('create')) return labels?.created || 'Created'
  if (a.includes('upload')) return labels?.uploaded || 'Uploaded'
  if (a.includes('replace')) return labels?.replaced || 'Replaced'
  if (a.includes('delete') || a.includes('reject')) return labels?.deleted || 'Deleted'
  if (a.includes('update') || a.includes('transfer') || a.includes('connect')) {
    return labels?.updated || 'Updated'
  }

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
    | 'fieldAmount'
    | 'fieldCurrency'
    | 'fieldTransactionDate'
    | 'fieldPaidBy'
    | 'fieldPaidFromScope'
    | 'fieldStatusReason'
    | 'fieldPaidAt'
    | 'fieldPaidByName'
    | 'fieldReviewedAt'
    | 'fieldReviewedByName'
    | 'fieldBankName'
    | 'fieldConnectionScope'
    | 'fieldFromScope'
    | 'fieldToScope'
    | 'fieldLocation'
    | 'fieldDecisionNote'
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
    amount: labels?.fieldAmount || 'Amount',
    currency: labels?.fieldCurrency || 'Currency',
    transactionDate: labels?.fieldTransactionDate || 'Transaction date',
    paidBy: labels?.fieldPaidBy || 'Paid by',
    paidFromScope: labels?.fieldPaidFromScope || 'Paid from',
    statusReason: labels?.fieldStatusReason || 'Reason',
    paidAt: labels?.fieldPaidAt || 'Paid at',
    paidByName: labels?.fieldPaidByName || 'Paid by',
    reviewedAt: labels?.fieldReviewedAt || 'Reviewed at',
    reviewedByName: labels?.fieldReviewedByName || 'Reviewed by',
    bankName: labels?.fieldBankName || 'Bank',
    connectionScope: labels?.fieldConnectionScope || 'Connection scope',
    fromScope: labels?.fieldFromScope || 'From account',
    toScope: labels?.fieldToScope || 'To account',
    location: labels?.fieldLocation || 'Location',
    decisionNote: labels?.fieldDecisionNote || 'Decision note',
  }

  return map[field || ''] || field || labels?.fieldFallback || 'Field'
}

function normalizeStatusDisplay(
  value?: string,
  labels?: Pick<
    AuditLogListLabels,
    'statusAdmin' | 'statusPersonal' | 'statusImportant' | 'statusChild'
  >,
) {
  const s = String(value || '').toLowerCase()

  if (!s) return ''
  if (s === 'admin') return labels?.statusAdmin || 'Admin'
  if (s === 'personal') return labels?.statusPersonal || 'Personal'
  if (s === 'important') return labels?.statusImportant || 'Important'
  if (s === 'child') return labels?.statusChild || 'Child'

  return value || ''
}

export function renderChangeValue(
  v?: string,
  empty = '—',
  labels?: Pick<
    AuditLogListLabels,
    | 'statusAdmin'
    | 'statusPersonal'
    | 'statusImportant'
    | 'statusChild'
    | 'yesLabel'
    | 'noLabel'
  >,
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
) {
  const value = String(v ?? '').trim()
  if (!value) return empty

  if (value === 'true') return labels?.yesLabel || 'Yes'
  if (value === 'false') return labels?.noLabel || 'No'

  const statusValue = normalizeStatusDisplay(value, labels)
  if (statusValue && statusValue !== value) return statusValue

  const maybeDate = new Date(value)
  if (!Number.isNaN(maybeDate.getTime()) && value.includes('T')) {
    return fmtDateTime(value, locale, timeZone, empty)
  }

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

function documentCategoryLabel(
  category?: string,
  labels?: Pick<
    AuditLogListLabels,
    | 'fieldCategoryAgreement'
    | 'fieldCategorySchool'
    | 'fieldCategoryHealth'
    | 'fieldCategoryId'
    | 'fieldCategoryOther'
  >,
) {
  if (category === 'agreement') return labels?.fieldCategoryAgreement || 'Agreement'
  if (category === 'school') return labels?.fieldCategorySchool || 'School'
  if (category === 'health') return labels?.fieldCategoryHealth || 'Health'
  if (category === 'id') return labels?.fieldCategoryId || 'ID'
  return labels?.fieldCategoryOther || 'Other'
}

export function getAuditTarget(a: AuditLog) {
  const meta = a.meta || {}

  if (meta.documentTitle) return meta.documentTitle
  if (meta.childName && a.entityType === 'child') return meta.childName
  if (meta.title) return meta.title

  return a.targetLabel || (a.entityId ? `#${a.entityId}` : '')
}

function buildEventSub(
  meta: any,
  a: AuditLog,
  labels?: Pick<AuditLogListLabels, 'forChild'>,
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
) {
  const childName = getChildName(a)
  const parts: string[] = []

  if (childName) parts.push(`${labels?.forChild || 'for'} ${childName}`)

  if (meta?.startAt && meta?.endAt) {
    const sameDay =
      fmtDateOnly(meta.startAt, locale, timeZone) ===
      fmtDateOnly(meta.endAt, locale, timeZone)

    if (meta?.allDay) {
      parts.push(
        sameDay
          ? fmtDateOnly(meta.startAt, locale, timeZone)
          : `${fmtDateOnly(meta.startAt, locale, timeZone)} → ${fmtDateOnly(meta.endAt, locale, timeZone)}`,
      )
    } else {
      parts.push(
        sameDay
          ? `${fmtDateOnly(meta.startAt, locale, timeZone)} • ${fmtTimeOnly(meta.startAt, locale, timeZone)}–${fmtTimeOnly(meta.endAt, locale, timeZone)}`
          : `${fmtDateTime(meta.startAt, locale, timeZone)} → ${fmtDateTime(meta.endAt, locale, timeZone)}`,
      )
    }
  }

  if (meta?.location) parts.push(meta.location)

  return parts.join(' • ')
}

function buildDocumentSub(
  a: AuditLog,
  fallback?: string,
  labels?: Pick<AuditLogListLabels, 'forChild'>,
) {
  const childName = getChildName(a)
  const parts: string[] = []

  if (childName) parts.push(`${labels?.forChild || 'for'} ${childName}`)
  if (fallback) parts.push(fallback)

  return parts.join(' • ')
}

function buildConnectionScopeLabel(
  scope?: string,
  labels?: Pick<AuditLogListLabels, 'fromLabel' | 'bankLabel'>,
) {
  if (!scope) return ''
  return `${labels?.fromLabel || 'from'} ${scope} ${labels?.bankLabel || 'bank'}`
}

export function auditPretty(
  a: AuditLog,
  labels?: AuditLogListLabels,
  locale = 'nb-NO',
  timeZone = 'Europe/Oslo',
) {
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
      target: meta?.title || a.targetLabel || '',
      sub: buildEventSub(meta, a, labels, locale, timeZone),
    }
  }

  if (action === 'event.update') {
    return {
      sentence: labels?.updatedCalendarEvent || 'updated calendar event',
      target: meta?.title || a.targetLabel || '',
      sub:
        buildEventSub(meta, a, labels, locale, timeZone) ||
        `${changes.length} ${labels?.fieldsChanged || 'fields changed'}`,
    }
  }

  if (action === 'event.delete') {
    return {
      sentence: labels?.deletedCalendarEvent || 'deleted calendar event',
      target: meta?.title || a.targetLabel || '',
      sub: buildEventSub(meta, a, labels, locale, timeZone),
    }
  }

  if (action === 'doc.upload') {
    return {
      sentence: labels?.uploadedDocument || 'uploaded document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${documentCategoryLabel(meta.documentCategory, labels)} • v${meta?.version ?? 1}`
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
          ? `${documentCategoryLabel(meta.documentCategory, labels)} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
        labels,
      ),
    }
  }

  if (action === 'doc.update') {
    const detailParts: string[] = []

    if (meta?.documentCategory) {
      detailParts.push(documentCategoryLabel(meta.documentCategory, labels))
    }

    if (changes.length > 0) {
      detailParts.push(`${changes.length} ${labels?.fieldsChanged || 'fields changed'}`)
    } else {
      detailParts.push(`v${meta?.version ?? 1}`)
    }

    return {
      sentence: labels?.updatedDocument || 'updated document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(a, detailParts.join(' • '), labels),
    }
  }

  if (action === 'doc.delete') {
    return {
      sentence: labels?.deletedDocument || 'deleted document',
      target: meta?.documentTitle || '',
      sub: buildDocumentSub(
        a,
        meta?.documentCategory
          ? `${documentCategoryLabel(meta.documentCategory, labels)} • v${meta?.version ?? 1}`
          : `v${meta?.version ?? 1}`,
        labels,
      ),
    }
  }

  if (action === 'post.create') {
    return {
      sentence:
        meta?.type === 'child-update'
          ? labels?.created || 'Created'
          : labels?.createdFamilyPost || 'created family post',
      target: meta?.title || '',
      sub:
        meta?.type === 'child-update'
          ? labels?.childUpdate || 'Child update'
          : labels?.generalPost || 'General post',
    }
  }

  if (action === 'post.update') {
    return {
      sentence:
        meta?.type === 'child-update'
          ? labels?.updated || 'Updated'
          : labels?.updatedFamilyPost || 'updated family post',
      target: meta?.title || '',
      sub: `${changes.length} ${labels?.fieldsChanged || 'fields changed'}`,
    }
  }

  if (action === 'post.delete') {
    return {
      sentence:
        meta?.type === 'child-update'
          ? labels?.deleted || 'Deleted'
          : labels?.deletedFamilyPost || 'deleted family post',
      target: meta?.title || '',
      sub:
        meta?.type === 'child-update'
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

  if (action === 'economy.transaction.create') {
    return {
      sentence: labels?.createdPaymentItem || 'created payment item',
      target: meta?.title || a.targetLabel || '',
      sub: [
        meta?.amount ? `${meta.amount} ${meta?.currency || 'NOK'}` : '',
        meta?.category || '',
        meta?.transactionDate
          ? fmtDateOnly(meta.transactionDate, locale, timeZone)
          : '',
      ]
        .filter(Boolean)
        .join(' • '),
    }
  }

  if (action === 'economy.transaction.update') {
    return {
      sentence: labels?.updatedPaymentItem || 'updated payment item',
      target: meta?.title || a.targetLabel || '',
      sub:
        changes.length > 0
          ? `${changes.length} ${labels?.fieldsChanged || 'fields changed'}`
          : '',
    }
  }

  if (action === 'economy.transaction.delete') {
    return {
      sentence: labels?.deletedPaymentItem || 'deleted payment item',
      target: meta?.title || a.targetLabel || '',
      sub: [
        meta?.amount ? `${meta.amount} ${meta?.currency || 'NOK'}` : '',
        meta?.category || '',
      ]
        .filter(Boolean)
        .join(' • '),
    }
  }

  if (action === 'economy.transaction.pay') {
    return {
      sentence: labels?.paidPaymentItem || 'paid payment item',
      target: meta?.title || a.targetLabel || '',
      sub: [
        meta?.amount ? `${meta.amount} ${meta?.currency || 'NOK'}` : '',
        buildConnectionScopeLabel(meta?.connectionScope, labels),
      ]
        .filter(Boolean)
        .join(' • '),
    }
  }

  if (action === 'economy.request.create') {
    return {
      sentence: labels?.createdMoneyRequest || 'created money request',
      target: meta?.title || a.targetLabel || '',
      sub: [
        meta?.amount ? `${meta.amount} ${meta?.currency || 'NOK'}` : '',
        meta?.category || '',
        meta?.childName ? `${labels?.forChild || 'for'} ${meta.childName}` : '',
      ]
        .filter(Boolean)
        .join(' • '),
    }
  }

  if (action === 'economy.request.approve') {
    return {
      sentence: labels?.approvedMoneyRequest || 'approved money request',
      target: meta?.title || a.targetLabel || '',
      sub: [
        meta?.amount ? `${meta.amount} ${meta?.currency || 'NOK'}` : '',
        buildConnectionScopeLabel(meta?.connectionScope, labels),
      ]
        .filter(Boolean)
        .join(' • '),
    }
  }

  if (action === 'economy.request.reject') {
    return {
      sentence: labels?.rejectedMoneyRequest || 'rejected money request',
      target: meta?.title || a.targetLabel || '',
      sub: meta?.decisionNote || '',
    }
  }

  if (action === 'bank.transfer') {
    return {
      sentence: labels?.transferredMoney || 'transferred money',
      target: meta?.note || '',
      sub: [
        meta?.amount ? `${meta.amount} ${meta?.currency || 'NOK'}` : '',
        meta?.fromScope && meta?.toScope ? `${meta.fromScope} → ${meta.toScope}` : '',
      ]
        .filter(Boolean)
        .join(' • '),
    }
  }

  if (action === 'bank.connect') {
    return {
      sentence: labels?.connectedBank || 'connected bank',
      target: meta?.bankName || '',
      sub: meta?.connectionScope || '',
    }
  }

  if (action === 'bank.disconnect') {
    return {
      sentence: labels?.disconnectedBank || 'disconnected bank',
      target: meta?.bankName || '',
      sub: meta?.connectionScope || '',
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

export function groupAuditLogsByDay(
  audits: AuditLog[],
  timeZone = 'Europe/Oslo',
) {
  const groups = new Map<string, AuditLog[]>()

  for (const audit of audits) {
    const key = getDateKey(audit.createdAt, timeZone) || 'Unknown'
    const existing = groups.get(key) || []
    existing.push(audit)
    groups.set(key, existing)
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
  }))
}