'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useTranslations } from '@/app/lib/i18n/useTranslations'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Plus,
  X,
  MapPin,
  UserRound,
  ArrowRightLeft,
  Loader2,
  Users,
  AlertTriangle,
  Wallet,
  Receipt,
} from 'lucide-react'
import styles from './dashboard.module.css'

type NotificationEventType =
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

type MeUser = {
  id: string | number
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
}

type ParentOption = {
  id: string | number
  fullName: string
  email?: string
}

type NotificationItem = {
  id: string | number
  title?: string
  message?: string
  createdAt?: string
  link?: string
  readAt?: string | null
  isRead?: boolean
  type?: 'calendar' | 'expense' | 'request' | 'bank' | 'status' | 'documents' | 'post'
  event?: NotificationEventType
  meta?: Record<string, any>
}

type DashboardEvent = {
  id: string | number
  title: string
  startAt: string
  endAt: string
  eventType?: string
  priority?: string
  location?: string
  requiresConfirmation?: boolean
  confirmationStatus?: 'not-required' | 'pending' | 'confirmed' | 'declined'
  child?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  handoverFrom?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  handoverTo?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  responsibleParent?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  confirmedBy?:
    | {
        id: string | number
        fullName?: string
        name?: string
        firstName?: string
        lastName?: string
        email?: string
      }
    | string
    | number
    | null
  confirmedAt?: string
  createdBy?: { id: string | number } | string | number | null
}

type ChildDashboardItem = {
  id: string | number
  fullName?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

type FamilyJoinPreview = {
  ok: boolean
  code: string
  alreadyMember: boolean
  isSameFamily: boolean
  willLeaveCurrentFamily: boolean
  warning?: string
  currentFamily?: {
    id: string | number
    name?: string
    inviteCode?: string
    memberCount?: number
  } | null
  targetFamily?: {
    id: string | number
    name?: string
    inviteCode?: string
    memberCount?: number
  } | null
}

type EconomyTransactionDoc = {
  id: string | number
  title: string
  amount: number
  currency?: string
  status?: 'paid' | 'pending'
  type?: 'expense' | 'income'
  category?: string
  transactionDate?: string
  child?: string | number | { id: string | number; fullName?: string; name?: string } | null
}

type EconomyRequestDoc = {
  id: string | number
  title: string
  amount: number
  category?: string
  notes?: string
  status?: 'pending' | 'approved' | 'rejected'
  child?: string | number | { id: string | number; fullName?: string; name?: string } | null
  createdBy?: string | number | { id: string | number } | null
  createdByName?: string
  createdAt?: string
}

type BankConnection = {
  id: string | number
  bankName?: string
  currentBalance?: number
  currency?: string
  status?: 'not_connected' | 'pending' | 'connected' | 'expired' | 'failed' | string
  connectionScope?: 'family' | 'personal'
}

type DecisionActionItem = {
  id: string | number
  kind: 'child' | 'event' | 'request-review'
  title: string
  subtitle: string
  detail: string
  href: string
  createdAt?: string
}

type OpenFinanceItem = {
  id: string | number
  kind: 'payment' | 'request-waiting'
  title: string
  subtitle: string
  detail: string
  href: string
  amount?: number
  currency?: string
  createdAt?: string
}

type FinanceOverview = {
  pendingPaymentCount: number
  pendingPaymentTotal: number
  pendingRequestReviewCount: number
  waitingRequestCount: number
  familyBankBalance: number
  familyBankCurrency: string
}

type DashboardData = {
  me: MeUser | null
  unreadNotifications: number
  notifications: NotificationItem[]
  childCount: number
  upcomingHandover: {
    id: string | number
    title: string
    startAt: string
    endAt: string
    location: string
    childName: string
    handoverFromName: string
    handoverToName: string
    responsibleParentName: string
    confirmationStatus: string
    confirmedByName: string
    confirmedAt?: string
  } | null
  decisionActions: DecisionActionItem[]
  openFinanceItems: OpenFinanceItem[]
  financeOverview: FinanceOverview
  upcomingEvents: Array<{
    id: string | number
    title: string
    startAt: string
    endAt: string
    childName: string
    eventType: string
    location: string
    confirmationStatus: string
    requiresConfirmation: boolean
  }>
}

function getRelId(v: any) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return v?.id != null ? String(v.id) : ''
}

function getRelDisplayName(v: any, nameMap?: Map<string, string>) {
  if (v == null) return ''

  if (typeof v === 'string' || typeof v === 'number') {
    const id = String(v)
    return nameMap?.get(id) || id
  }

  const id = v?.id != null ? String(v.id) : ''
  const full =
    `${String(v?.firstName || '').trim()} ${String(v?.lastName || '').trim()}`.trim()

  return v.fullName || v.name || full || (id ? nameMap?.get(id) || '' : '') || v.email || ''
}

function shorten(text?: string, max = 80) {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function getCountdownParts(targetIso?: string) {
  if (!targetIso) return null

  const now = Date.now()
  const target = new Date(targetIso).getTime()
  const diff = target - now

  if (Number.isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }

  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  return { days, hours, minutes, expired: false }
}

export default function DashboardPage() {
  const router = useRouter()
  const t = useTranslations()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [parents, setParents] = useState<ParentOption[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPreview, setJoinPreview] = useState<FamilyJoinPreview | null>(null)
  const [joinModalOpen, setJoinModalOpen] = useState(false)

const locale =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/en')
    ? 'en-US'
    : 'nb-NO'
    
  function fmtCurrency(amount?: number, currency = 'NOK') {
    const value = Number(amount || 0)

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value)
    } catch {
      return `${value.toFixed(2)} ${currency}`
    }
  }

  function formatNotificationTime(value?: string) {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return format(d, 'dd.MM, HH:mm')
  }

  function getDisplayName(me: MeUser | null) {
    if (!me) return t.dashboard.there

    const full =
      `${String(me.firstName || '').trim()} ${String(me.lastName || '').trim()}`.trim() ||
      String(me.fullName || '').trim()

    return full || t.dashboard.there
  }

  function getEventTypeLabel(type?: string) {
    switch (String(type || 'other')) {
      case 'handover':
        return t.dashboard.eventTypeHandover
      case 'pickup':
        return t.dashboard.eventTypePickup
      case 'dropoff':
        return t.dashboard.eventTypeDropoff
      case 'school':
        return t.dashboard.eventTypeSchool
      case 'activity':
        return t.dashboard.eventTypeActivity
      case 'medical':
        return t.dashboard.eventTypeMedical
      case 'payment':
        return t.dashboard.eventTypePayment
      default:
        return t.dashboard.eventTypeOther
    }
  }

  function getStatusTone(status?: string, requiresConfirmation?: boolean) {
    if (!requiresConfirmation || status === 'not-required') {
      return {
        label: t.dashboard.noConfirmationNeeded,
        className: styles.statusNeutral,
      }
    }

    if (status === 'pending') {
      return {
        label: t.dashboard.needsConfirmation,
        className: styles.statusPending,
      }
    }

    if (status === 'confirmed') {
      return {
        label: t.dashboard.confirmed,
        className: styles.statusConfirmed,
      }
    }

    return {
      label: t.dashboard.declined,
      className: styles.statusDeclined,
    }
  }

  function buildNotificationTitle(item: NotificationItem) {
    const meta = item.meta || {}
    const actorName = String(meta.actorName || t.dashboard.aParent).trim()
    const childName = String(meta.childName || '').trim()
    const eventType = getEventTypeLabel(meta.eventType)
    const rawTitle = String(item.title || t.dashboard.notification).trim()
    const isChildUpdate = !!meta.isChildUpdate
    const documentName = String(meta.documentName || item.title || '').trim()

    if (item.type === 'calendar') {
      if (item.event === 'created') {
        return `${actorName} ${t.dashboard.createdEventTitle} ${eventType.toLowerCase()}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
      }
      if (item.event === 'updated') {
        return `${actorName} ${t.dashboard.updatedEventTitle} ${eventType.toLowerCase()}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
      }
      if (item.event === 'deleted') {
        return `${actorName} ${t.dashboard.deletedEventTitle} ${eventType.toLowerCase()}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
      }
      if (item.event === 'confirmed') {
        return `${actorName} ${t.dashboard.acceptedEventTitle} ${eventType.toLowerCase()}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
      }
      if (item.event === 'declined') {
        return `${actorName} ${t.dashboard.declinedEventTitle} ${eventType.toLowerCase()}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
      }
    }

    if (item.type === 'expense') {
      if (item.event === 'created') return `${actorName} ${t.dashboard.createdPaymentItem}`
      if (item.event === 'updated') return `${actorName} ${t.dashboard.updatedPaymentItem}`
      if (item.event === 'deleted') return `${actorName} ${t.dashboard.deletedPaymentItem}`
      if (item.event === 'paid') return `${actorName} ${t.dashboard.paidPaymentItem}`
    }

    if (item.type === 'request') {
      if (item.event === 'created') return `${actorName} ${t.dashboard.createdMoneyRequest}`
      if (item.event === 'approved') return `${actorName} ${t.dashboard.approvedMoneyRequest}`
      if (item.event === 'rejected') return `${actorName} ${t.dashboard.rejectedMoneyRequest}`
    }

    if (item.type === 'status') {
      if (item.event === 'created' && childName) return `${t.dashboard.newChildProfile}: ${childName}`
      if (item.event === 'updated' && childName && meta.needsConfirmation) {
        return `${childName} ${t.dashboard.needsConfirmationShort}`
      }
      if (item.event === 'updated' && childName) return `${childName} ${t.dashboard.profileUpdated}`
      if (item.event === 'confirmed' && childName) return `${childName} ${t.dashboard.wasConfirmed}`
      if (item.event === 'declined' && childName) return `${childName} ${t.dashboard.wasDeclined}`
    }

    if (item.type === 'documents') {
      if (item.event === 'uploaded') {
        return childName
          ? `${t.dashboard.documentUploadedFor} ${childName}`
          : documentName
            ? `${t.dashboard.documentUploaded}: ${documentName}`
            : t.dashboard.documentUploadedPlain
      }
      if (item.event === 'replaced') {
        return childName
          ? `${t.dashboard.documentReplacedFor} ${childName}`
          : documentName
            ? `${t.dashboard.documentReplaced}: ${documentName}`
            : t.dashboard.documentReplacedPlain
      }
      if (item.event === 'updated') {
        return childName
          ? `${t.dashboard.documentUpdatedFor} ${childName}`
          : documentName
            ? `${t.dashboard.documentUpdated}: ${documentName}`
            : t.dashboard.documentUpdatedPlain
      }
      if (item.event === 'deleted') {
        return childName
          ? `${t.dashboard.documentDeletedFor} ${childName}`
          : documentName
            ? `${t.dashboard.documentDeleted}: ${documentName}`
            : t.dashboard.documentDeletedPlain
      }
    }

    if (item.type === 'post') {
      if (item.event === 'created') {
        return isChildUpdate
          ? `${t.dashboard.newUpdate}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
          : t.dashboard.newFamilyUpdate
      }
      if (item.event === 'updated') {
        return isChildUpdate
          ? `${t.dashboard.updateEdited}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
          : t.dashboard.familyUpdateEdited
      }
      if (item.event === 'deleted') {
        return isChildUpdate
          ? `${t.dashboard.updateDeleted}${childName ? ` ${t.dashboard.forChild} ${childName}` : ''}`
          : t.dashboard.familyUpdateDeleted
      }
      if (item.event === 'commented') {
        return childName ? `${t.dashboard.newCommentFor} ${childName}` : t.dashboard.newCommentOnUpdate
      }
      if (item.event === 'liked') {
        return childName ? `${t.dashboard.updateLikedFor} ${childName}` : t.dashboard.updateLiked
      }
    }

    return rawTitle || t.dashboard.notification
  }

  function buildNotificationMessage(item: NotificationItem) {
    const meta = item.meta || {}
    const actorName = String(meta.actorName || t.dashboard.aParent).trim()
    const childName = String(meta.childName || '').trim()
    const documentName = shorten(meta.documentName || item.title || '')
    const postTitle = shorten(meta.title || item.message || '')
    const confirmedAt = String(meta.confirmedAt || '').trim()

    if (item.type === 'calendar') {
      const parts = [
        meta.startAt ? formatNotificationTime(meta.startAt) : '',
        meta.handoverFromName && meta.handoverToName
          ? `${meta.handoverFromName} → ${meta.handoverToName}`
          : '',
        meta.location || '',
      ].filter(Boolean)

      if (item.event === 'created') {
        return parts.length
          ? `${actorName} ${t.dashboard.createdThisEvent}. ${parts.join(' · ')}`
          : `${actorName} ${t.dashboard.createdThisEvent}.`
      }
      if (item.event === 'confirmed') {
        return `${actorName} ${t.dashboard.acceptedThisEvent}${confirmedAt ? ` ${t.dashboard.at} ${confirmedAt}` : ''}.`
      }
      if (item.event === 'declined') {
        return `${actorName} ${t.dashboard.declinedThisEvent}${confirmedAt ? ` ${t.dashboard.at} ${confirmedAt}` : ''}.`
      }
      if (item.event === 'deleted') {
        return parts.length
          ? `${actorName} ${t.dashboard.deletedThisEvent}. ${parts.join(' · ')}`
          : `${actorName} ${t.dashboard.deletedThisEvent}.`
      }
      if (item.event === 'updated') {
        return parts.length
          ? `${actorName} ${t.dashboard.updatedThisEvent}. ${parts.join(' · ')}`
          : `${actorName} ${t.dashboard.updatedThisEvent}.`
      }
    }

    if (item.type === 'expense') {
      const amount = meta.amount ? fmtCurrency(meta.amount, meta.currency || 'NOK') : ''
      const due = meta.transactionDate ? formatNotificationTime(meta.transactionDate) : ''
      return [amount, due, childName ? `${t.dashboard.childLabel}: ${childName}` : '']
        .filter(Boolean)
        .join(' · ')
    }

    if (item.type === 'request') {
      const amount = meta.amount ? fmtCurrency(meta.amount, meta.currency || 'NOK') : ''
      return [amount, childName ? `${t.dashboard.childLabel}: ${childName}` : '', meta.category || '']
        .filter(Boolean)
        .join(' · ')
    }

    if (item.type === 'status') {
      if (item.event === 'created' && childName) {
        return `${actorName} ${t.dashboard.createdThisChildProfile}. ${t.dashboard.waitingForSecondParentConfirmation}`
      }
      if (item.event === 'updated' && childName && meta.needsConfirmation) {
        return `${actorName} ${t.dashboard.updatedThisChildProfile}. ${t.dashboard.waitingForSecondParentConfirmation}`
      }
      if (item.event === 'updated' && childName) return `${actorName} ${t.dashboard.updatedThisChildProfile}.`
      if (item.event === 'confirmed' && childName) return `${actorName} ${t.dashboard.confirmedThisChildProfile}.`
      if (item.event === 'declined' && childName) return `${actorName} ${t.dashboard.declinedThisChildProfile}.`
    }

    if (item.type === 'documents') {
      if (item.event === 'uploaded') {
        return `${actorName} ${t.dashboard.uploaded}${documentName ? ` "${documentName}"` : ` ${t.dashboard.aDocument}`}.`
      }
      if (item.event === 'replaced') {
        return `${actorName} ${t.dashboard.replaced}${documentName ? ` "${documentName}"` : ` ${t.dashboard.aDocument}`}.`
      }
      if (item.event === 'updated') {
        return `${actorName} ${t.dashboard.updated}${documentName ? ` "${documentName}"` : ` ${t.dashboard.aDocument}`}.`
      }
      if (item.event === 'deleted') {
        return `${actorName} ${t.dashboard.deleted}${documentName ? ` "${documentName}"` : ` ${t.dashboard.aDocument}`}.`
      }
    }

    if (item.type === 'post') {
      if (item.event === 'created') {
        return childName
          ? `${actorName} ${t.dashboard.createdThePost} "${postTitle}" ${t.dashboard.forChild} ${childName}.`
          : `${actorName} ${t.dashboard.createdThePost} "${postTitle}".`
      }
      if (item.event === 'updated') {
        return childName
          ? `${actorName} ${t.dashboard.updatedThePost} "${postTitle}" ${t.dashboard.forChild} ${childName}.`
          : `${actorName} ${t.dashboard.updatedThePost} "${postTitle}".`
      }
      if (item.event === 'deleted') {
        return childName
          ? `${actorName} ${t.dashboard.deletedThePost} "${postTitle}" ${t.dashboard.forChild} ${childName}.`
          : `${actorName} ${t.dashboard.deletedThePost} "${postTitle}".`
      }
      if (item.event === 'commented') return `${actorName} ${t.dashboard.commentedOn} "${postTitle}".`
      if (item.event === 'liked') return `${actorName} ${t.dashboard.liked} "${postTitle}".`
    }

    return item.message || t.dashboard.openToViewDetails
  }

  const parentNameById = useMemo(() => {
    const m = new Map<string, string>()
    parents.forEach((p) => {
      m.set(String(p.id), p.fullName || p.email || String(p.id))
    })
    return m
  }, [parents])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const [
        meRes,
        calendarRes,
        notificationsRes,
        childrenCountRes,
        pendingChildrenRes,
        parentsRes,
        economyTransactionsRes,
        economyRequestsRes,
        bankStatusRes,
      ] = await Promise.all([
        fetch('/api/customers/me', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/calendar-events?limit=100&sort=startAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/notifications/me?limit=8&sort=-createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/children?limit=100', { credentials: 'include', cache: 'no-store' }).catch(() => null),
        fetch('/api/children?limit=20&sort=-updatedAt&where[status][equals]=pending&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/customers?limit=200&sort=createdAt&depth=0', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/economy-transactions?limit=100&sort=transactionDate', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/economy-requests?limit=100&sort=-createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch('/api/bank-connections/status', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
      ])

      const meJson = await meRes.json().catch(() => null)
      const calendarJson = await calendarRes.json().catch(() => null)
      const notificationsJson = notificationsRes ? await notificationsRes.json().catch(() => null) : null
      const childrenCountJson = childrenCountRes ? await childrenCountRes.json().catch(() => null) : null
      const pendingChildrenJson = pendingChildrenRes ? await pendingChildrenRes.json().catch(() => null) : null
      const parentsJson = parentsRes ? await parentsRes.json().catch(() => null) : null
      const economyTransactionsJson = economyTransactionsRes ? await economyTransactionsRes.json().catch(() => null) : null
      const economyRequestsJson = economyRequestsRes ? await economyRequestsRes.json().catch(() => null) : null
      const bankStatusJson = bankStatusRes ? await bankStatusRes.json().catch(() => null) : null

      if (!meRes.ok) throw new Error(meJson?.message || `${t.dashboard.couldNotLoadCurrentUser} (${meRes.status})`)
      if (!calendarRes.ok) {
        throw new Error(calendarJson?.message || `${t.dashboard.couldNotLoadCalendarEvents} (${calendarRes.status})`)
      }

      setParents(
        (parentsJson?.docs ?? []).map((p: any) => ({
          id: p.id,
          fullName:
            p.fullName ||
            p.name ||
            `${String(p?.firstName || '').trim()} ${String(p?.lastName || '').trim()}`.trim() ||
            p.email ||
            `${t.dashboard.parent} ${p.id}`,
          email: p.email,
        })),
      )

      const docs: DashboardEvent[] = calendarJson?.docs ?? []
      const currentUserId = String(meJson?.user?.id || meJson?.id || '')
      const now = new Date()

      const upcoming = docs
        .filter((event) => new Date(event.endAt).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      const visibleUpcoming = upcoming.filter((event) => event.confirmationStatus !== 'declined')

      const confirmableUpcoming = visibleUpcoming.filter((event) => {
        return (
          event.requiresConfirmation === true &&
          event.confirmationStatus === 'pending' &&
          String((event.createdBy as any)?.id || event.createdBy || '') !== currentUserId
        )
      })

      const upcomingHandover = visibleUpcoming.find((event) => event.eventType === 'handover') ?? null

      const decisionEventActions: DecisionActionItem[] = confirmableUpcoming.map((event) => ({
        id: event.id,
        kind: 'event',
        title: event.title,
        subtitle: `${getRelDisplayName(event.child) || t.dashboard.noChild} · ${getEventTypeLabel(event.eventType)}`,
        detail: `${format(new Date(event.startAt), 'dd.MM.yyyy HH:mm')}${event.location ? ` · ${event.location}` : ''}`,
        href: `/calendar?event=${event.id}`,
        createdAt: event.startAt,
      }))

      const pendingChildDocs: ChildDashboardItem[] = pendingChildrenJson?.docs ?? []

      const decisionChildActions: DecisionActionItem[] = pendingChildDocs.map((child) => ({
        id: child.id,
        kind: 'child',
        title: child.fullName || t.dashboard.childProfile,
        subtitle: t.dashboard.childProfilePendingConfirmation,
        detail: child.updatedAt
          ? `${t.dashboard.lastUpdated} ${format(new Date(child.updatedAt), 'dd.MM.yyyy HH:mm')}`
          : t.dashboard.needsSecondParentConfirmation,
        href: `/child-info/${child.id}`,
        createdAt: child.createdAt,
      }))

      const txDocs: EconomyTransactionDoc[] = economyTransactionsJson?.docs ?? []
      const pendingPayments = txDocs
        .filter((item) => item.type === 'expense' && item.status === 'pending')
        .sort((a, b) => new Date(a.transactionDate || 0).getTime() - new Date(b.transactionDate || 0).getTime())

      const openPaymentItems: OpenFinanceItem[] = pendingPayments.slice(0, 5).map((item) => ({
        id: item.id,
        kind: 'payment',
        title: item.title,
        subtitle: `${getRelDisplayName(item.child) || t.dashboard.noChild} · ${t.dashboard.sharedPaymentItem}`,
        detail: `${item.transactionDate ? `${t.dashboard.due} ${format(new Date(item.transactionDate), 'dd.MM.yyyy')}` : t.dashboard.noDueDate} · ${fmtCurrency(item.amount, item.currency || 'NOK')}`,
        href: '/economy',
        createdAt: item.transactionDate,
        amount: item.amount,
        currency: item.currency || 'NOK',
      }))

      const requestDocs: EconomyRequestDoc[] = economyRequestsJson?.docs ?? []
      const pendingRequests = requestDocs
        .filter((item) => item.status === 'pending')
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

      const dashboardCurrency =
        bankStatusJson?.familyBank?.currency || bankStatusJson?.personalBank?.currency || 'NOK'

      const decisionRequestActions: DecisionActionItem[] = pendingRequests
        .filter((item) => String(getRelId(item.createdBy)) !== currentUserId)
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          kind: 'request-review',
          title: item.title,
          subtitle: `${item.createdByName || t.dashboard.otherParent} · ${t.dashboard.requestNeedsReview}`,
          detail: `${fmtCurrency(item.amount, dashboardCurrency)}${item.category ? ` · ${item.category}` : ''}`,
          href: '/economy',
          createdAt: item.createdAt,
        }))

      const openWaitingRequests: OpenFinanceItem[] = pendingRequests
        .filter((item) => String(getRelId(item.createdBy)) === currentUserId)
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          kind: 'request-waiting',
          title: item.title,
          subtitle: t.dashboard.yourRequestWaitingForReview,
          detail: `${fmtCurrency(item.amount, dashboardCurrency)}${item.category ? ` · ${item.category}` : ''}`,
          href: '/economy',
          createdAt: item.createdAt,
          amount: item.amount,
          currency: dashboardCurrency,
        }))

      const familyBank: BankConnection | null = bankStatusJson?.familyBank ?? null

      const financeOverview: FinanceOverview = {
        pendingPaymentCount: pendingPayments.length,
        pendingPaymentTotal: pendingPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        pendingRequestReviewCount: pendingRequests.filter((item) => String(getRelId(item.createdBy)) !== currentUserId).length,
        waitingRequestCount: pendingRequests.filter((item) => String(getRelId(item.createdBy)) === currentUserId).length,
        familyBankBalance: Number(familyBank?.currentBalance || 0),
        familyBankCurrency: familyBank?.currency || 'NOK',
      }

      const notifications: NotificationItem[] = notificationsJson?.docs ?? []
      const unreadNotifications = notifications.filter((item) => !item.readAt && !item.isRead).length

      setData({
        me: meJson?.user ?? meJson ?? null,
        unreadNotifications,
        notifications,
        childCount:
          childrenCountJson?.totalDocs ??
          (Array.isArray(childrenCountJson?.docs) ? childrenCountJson.docs.length : 0),
        upcomingHandover: upcomingHandover
          ? {
              id: upcomingHandover.id,
              title: upcomingHandover.title,
              startAt: upcomingHandover.startAt,
              endAt: upcomingHandover.endAt,
              location: upcomingHandover.location || '',
              childName: getRelDisplayName(upcomingHandover.child),
              handoverFromName: getRelDisplayName(upcomingHandover.handoverFrom, parentNameById),
              handoverToName: getRelDisplayName(upcomingHandover.handoverTo, parentNameById),
              responsibleParentName: getRelDisplayName(upcomingHandover.responsibleParent, parentNameById),
              confirmationStatus: upcomingHandover.confirmationStatus || 'not-required',
              confirmedByName: getRelDisplayName(upcomingHandover.confirmedBy, parentNameById),
              confirmedAt: upcomingHandover.confirmedAt,
            }
          : null,
        decisionActions: [...decisionChildActions, ...decisionEventActions, ...decisionRequestActions],
        openFinanceItems: [...openWaitingRequests, ...openPaymentItems],
        financeOverview,
        upcomingEvents: visibleUpcoming.slice(0, 6).map((event) => ({
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          childName: getRelDisplayName(event.child),
          eventType: event.eventType || 'other',
          location: event.location || '',
          confirmationStatus: event.confirmationStatus || 'not-required',
          requiresConfirmation: !!event.requiresConfirmation,
        })),
      })
    } catch (err: any) {
      setError(err?.message || t.dashboard.somethingWentWrong)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const greetingName = useMemo(() => getDisplayName(data?.me ?? null), [data?.me])
  const countdown = useMemo(() => getCountdownParts(data?.upcomingHandover?.startAt), [data?.upcomingHandover?.startAt])

  async function markNotificationAsRead(id: string | number) {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {}
  }

  async function handleNotificationClick(e: React.MouseEvent<HTMLAnchorElement>, item: NotificationItem) {
    e.preventDefault()

    const href = item.link || '/notifications'
    const wasUnread = !item.readAt && !item.isRead

    if (wasUnread) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          unreadNotifications: Math.max(0, prev.unreadNotifications - 1),
          notifications: prev.notifications.map((n) =>
            String(n.id) === String(item.id)
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n,
          ),
        }
      })
    }

    setNotifOpen(false)
    await markNotificationAsRead(item.id)
    router.push(href)
  }

  async function handleConfirmation(eventId: string | number, nextStatus: 'confirmed' | 'declined') {
    try {
      setActionLoading(`confirm-${eventId}-${nextStatus}`)

      const res = await fetch(`/api/calendar-events/${eventId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationStatus: nextStatus,
        }),
      })

      const raw = await res.text()
      let json: any = null

      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        throw new Error(
          json?.message || json?.errors?.[0]?.message || raw || t.dashboard.couldNotUpdateConfirmation,
        )
      }

      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || t.dashboard.couldNotUpdateConfirmation)
    } finally {
      setActionLoading('')
    }
  }

  async function previewJoinFamily() {
    try {
      setError('')
      setActionLoading('join-preview')

      const code = joinCode.trim().toUpperCase()
      if (!code) throw new Error(t.dashboard.pleaseEnterInviteCode)

      const res = await fetch('/api/families/join/preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) throw new Error(json?.message || raw || t.dashboard.couldNotPreviewFamilyJoin)

      setJoinPreview(json)
      setJoinModalOpen(true)
    } catch (err: any) {
      setError(err?.message || t.dashboard.couldNotPreviewFamilyJoin)
    } finally {
      setActionLoading('')
    }
  }

  async function confirmJoinFamily() {
    try {
      setError('')
      setActionLoading('join-confirm')

      const code = joinCode.trim().toUpperCase()
      if (!code) throw new Error(t.dashboard.pleaseEnterInviteCode)

      const res = await fetch('/api/families/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          confirmJoin: true,
        }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) throw new Error(json?.message || raw || t.dashboard.couldNotJoinFamily)

      setJoinModalOpen(false)
      setJoinPreview(null)
      setJoinCode('')
      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || t.dashboard.couldNotJoinFamily)
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <div className={styles.state}>{t.dashboard.loadingDashboard}</div>
  }

  if (error && !data) {
    return <div className={styles.stateError}>{error}</div>
  }

  if (!data) {
    return <div className={styles.state}>{t.dashboard.noData}</div>
  }

  const handoverTone = getStatusTone(
    data.upcomingHandover?.confirmationStatus,
    data.upcomingHandover?.confirmationStatus !== 'not-required',
  )

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {t.dashboard.goodMorning}, {greetingName}
          </h1>
          <p className={styles.subtitle}>{t.dashboard.structuredOverviewToday}</p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.bellWrap}>
            <button
              type="button"
              className={styles.bellBtn}
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label={t.dashboard.openNotifications}
            >
              <Bell size={18} />
              {data.unreadNotifications > 0 ? (
                <span className={styles.bellCount}>
                  {data.unreadNotifications > 9 ? '9+' : data.unreadNotifications}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>
                  <span className={styles.notifTitle}>{t.dashboard.recentNotifications}</span>
                  <Link href="/notifications" className={styles.notifViewAll}>
                    {t.dashboard.viewAll}
                  </Link>
                </div>

                {data.notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>{t.dashboard.noNotificationsYet}</div>
                ) : (
                  <div className={styles.notifList}>
                    {data.notifications.map((item) => (
                      <a
                        key={String(item.id)}
                        href={item.link || '/notifications'}
                        className={styles.notifItem}
                        onClick={(e) => handleNotificationClick(e, item)}
                      >
                        <div className={styles.notifItemTitle}>{buildNotificationTitle(item)}</div>
                        <div className={styles.notifItemMessage}>{buildNotificationMessage(item)}</div>
                        <div className={styles.notifItemTime}>{formatNotificationTime(item.createdAt)}</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <Link href="/calendar" className={styles.primaryBtn}>
            <Plus size={16} />
            {t.dashboard.addEvent}
          </Link>
        </div>
      </header>

      {error ? <div className={styles.inlineError}>{error}</div> : null}

      {data.childCount === 0 ? (
        <section className={styles.bannerCard}>
          <div className={styles.bannerIcon}>
            <Users size={20} />
          </div>

          <div className={styles.bannerBody}>
            <div className={styles.bannerTitle}>{t.dashboard.noChildProfileYet}</div>
            <div className={styles.bannerText}>{t.dashboard.noChildProfileDescription}</div>
          </div>

          <div className={styles.bannerActions}>
            <Link href="/child-info/new" className={styles.primaryBtn}>
              {t.dashboard.createChildProfile}
            </Link>
          </div>
        </section>
      ) : null}

      <section className={styles.joinCard}>
        <div className={styles.joinHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              <Users size={18} />
              <span>{t.dashboard.joinFamily}</span>
            </h2>
            <p className={styles.joinText}>{t.dashboard.joinFamilyDescription}</p>
          </div>
        </div>

        <div className={styles.joinForm}>
          <input
            className={styles.joinInput}
            type="text"
            placeholder={t.dashboard.enterInviteCode}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={20}
          />

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={previewJoinFamily}
            disabled={!joinCode.trim() || actionLoading === 'join-preview'}
          >
            {actionLoading === 'join-preview' ? (
              <>
                <Loader2 size={16} className={styles.spin} />
                {t.dashboard.checking}
              </>
            ) : (
              t.dashboard.joinFamily
            )}
          </button>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.heroCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <ArrowRightLeft size={18} />
              <span>{t.dashboard.upcomingHandover}</span>
            </h2>

            {data.upcomingHandover ? (
              <Link href={`/calendar?event=${data.upcomingHandover.id}`} className={styles.cardLink}>
                {t.dashboard.viewDetails}
              </Link>
            ) : null}
          </div>

          {data.upcomingHandover ? (
            <div className={styles.handoverBox}>
              <div className={styles.handoverMain}>
                <div className={styles.handoverTitle}>{data.upcomingHandover.title}</div>

                <div className={styles.handoverMeta}>
                  <span>
                    <UserRound size={14} />
                    {t.dashboard.childLabel}: {data.upcomingHandover.childName || t.dashboard.notSet}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {format(new Date(data.upcomingHandover.startAt), 'dd.MM.yyyy HH:mm')}
                  </span>
                  <span>
                    <MapPin size={14} />
                    {data.upcomingHandover.location || t.dashboard.noLocation}
                  </span>
                </div>

                <div className={styles.handoverFlow}>
                  <div className={styles.flowBox}>
                    <div className={styles.flowLabel}>{t.dashboard.from}</div>
                    <div className={styles.flowValue}>{data.upcomingHandover.handoverFromName || t.dashboard.notSet}</div>
                  </div>

                  <div className={styles.flowArrow}>→</div>

                  <div className={styles.flowBox}>
                    <div className={styles.flowLabel}>{t.dashboard.to}</div>
                    <div className={styles.flowValue}>{data.upcomingHandover.handoverToName || t.dashboard.notSet}</div>
                  </div>
                </div>

                <div className={styles.handoverResponsible}>
                  {t.dashboard.responsible}: {data.upcomingHandover.responsibleParentName || t.dashboard.notAssigned}
                </div>

                <div className={styles.handoverResponsible}>
                  {t.dashboard.status}:{' '}
                  <span className={`${styles.statusBadge} ${handoverTone.className}`}>
                    {handoverTone.label}
                  </span>
                  {data.upcomingHandover.confirmationStatus !== 'pending' &&
                  data.upcomingHandover.confirmedByName
                    ? ` · ${t.dashboard.by} ${data.upcomingHandover.confirmedByName}`
                    : ''}
                </div>
              </div>

              <div className={styles.countdownCard}>
                <div className={styles.countdownLabel}>{t.dashboard.nextHandoverIn}</div>

                {countdown && !countdown.expired ? (
                  <div className={styles.countdownGrid}>
                    <div className={styles.countdownItem}>
                      <strong>{String(countdown.days).padStart(2, '0')}</strong>
                      <span>{t.dashboard.days}</span>
                    </div>
                    <div className={styles.countdownItem}>
                      <strong>{String(countdown.hours).padStart(2, '0')}</strong>
                      <span>{t.dashboard.hours}</span>
                    </div>
                    <div className={styles.countdownItem}>
                      <strong>{String(countdown.minutes).padStart(2, '0')}</strong>
                      <span>{t.dashboard.mins}</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.countdownExpired}>{t.dashboard.startingSoon}</div>
                )}

                <div className={styles.heroActions}>
                  {data.upcomingHandover.confirmationStatus === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className={styles.approveBtn}
                        onClick={() => handleConfirmation(data.upcomingHandover!.id, 'confirmed')}
                        disabled={actionLoading === `confirm-${data.upcomingHandover.id}-confirmed`}
                      >
                        {actionLoading === `confirm-${data.upcomingHandover.id}-confirmed` ? (
                          <>
                            <Loader2 size={16} className={styles.spin} />
                            {t.dashboard.saving}
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            {t.dashboard.accept}
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className={styles.declineBtn}
                        onClick={() => handleConfirmation(data.upcomingHandover!.id, 'declined')}
                        disabled={actionLoading === `confirm-${data.upcomingHandover.id}-declined`}
                      >
                        {actionLoading === `confirm-${data.upcomingHandover.id}-declined` ? (
                          <>
                            <Loader2 size={16} className={styles.spin} />
                            {t.dashboard.saving}
                          </>
                        ) : (
                          <>
                            <X size={16} />
                            {t.dashboard.decline}
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <Link href={`/calendar?event=${data.upcomingHandover.id}`} className={styles.secondaryBtn}>
                      {t.dashboard.viewDetails}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>{t.dashboard.noUpcomingHandover}</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t.dashboard.quickActions}</h2>
          </div>

          <div className={styles.quickList}>
            <Link href="/calendar" className={styles.quickAction}>
              <CalendarDays size={16} />
              <span>{t.dashboard.addCalendarEvent}</span>
              <ChevronRight size={16} />
            </Link>

            <Link href="/economy" className={styles.quickAction}>
              <span>💰</span>
              <span>{t.dashboard.openEconomy}</span>
              <ChevronRight size={16} />
            </Link>

            <Link href="/child-info" className={styles.quickAction}>
              <span>👶</span>
              <span>{t.dashboard.openChildProfiles}</span>
              <ChevronRight size={16} />
            </Link>

            <Link href="/profile" className={styles.quickAction}>
              <span>👤</span>
              <span>{t.dashboard.openProfile}</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t.dashboard.needsYourDecision}</h2>
            <Link href="/economy" className={styles.cardLink}>
              {t.dashboard.openRelevantPage}
            </Link>
          </div>

          {data.decisionActions.length ? (
            <div className={styles.pendingList}>
              {data.decisionActions.map((item) => (
                <div key={`${item.kind}-${item.id}`} className={styles.pendingItem}>
                  <Link href={item.href} className={styles.pendingBody}>
                    <div className={styles.pendingTitle}>{item.title}</div>
                    <div className={styles.pendingMeta}>{item.subtitle}</div>
                    <div className={styles.pendingMeta}>{item.detail}</div>
                  </Link>

                  <div className={styles.pendingButtons}>
                    {item.kind === 'event' ? (
                      <>
                        <button
                          type="button"
                          className={styles.smallApproveBtn}
                          onClick={() => handleConfirmation(item.id, 'confirmed')}
                          disabled={actionLoading === `confirm-${item.id}-confirmed`}
                        >
                          {actionLoading === `confirm-${item.id}-confirmed` ? (
                            <Loader2 size={14} className={styles.spin} />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>

                        <button
                          type="button"
                          className={styles.smallDeclineBtn}
                          onClick={() => handleConfirmation(item.id, 'declined')}
                          disabled={actionLoading === `confirm-${item.id}-declined`}
                        >
                          {actionLoading === `confirm-${item.id}-declined` ? (
                            <Loader2 size={14} className={styles.spin} />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      </>
                    ) : (
                      <Link href={item.href} className={styles.secondaryBtn}>
                        {t.dashboard.review}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t.dashboard.noDecisionsWaiting}</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Wallet size={18} />
              <span>{t.dashboard.familyFinanceOverview}</span>
            </h2>
            <Link href="/economy" className={styles.cardLink}>
              {t.dashboard.openEconomy}
            </Link>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>{t.dashboard.pendingPayments}</div>
              <div className={styles.statValue}>{data.financeOverview.pendingPaymentCount}</div>
              <div className={styles.statSub}>
                {fmtCurrency(
                  data.financeOverview.pendingPaymentTotal,
                  data.financeOverview.familyBankCurrency,
                )}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>{t.dashboard.requestsToReview}</div>
              <div className={styles.statValue}>{data.financeOverview.pendingRequestReviewCount}</div>
              <div className={styles.statSub}>{t.dashboard.needYourDecision}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>{t.dashboard.yourWaitingRequests}</div>
              <div className={styles.statValue}>{data.financeOverview.waitingRequestCount}</div>
              <div className={styles.statSub}>{t.dashboard.waitingForOtherParent}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>{t.dashboard.familyBank}</div>
              <div className={styles.statValue}>
                {fmtCurrency(
                  data.financeOverview.familyBankBalance,
                  data.financeOverview.familyBankCurrency,
                )}
              </div>
              <div className={styles.statSub}>{t.dashboard.currentBalance}</div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Receipt size={18} />
              <span>{t.dashboard.openFamilyFinance}</span>
            </h2>
            <Link href="/economy" className={styles.cardLink}>
              {t.dashboard.viewAll}
            </Link>
          </div>

          {data.openFinanceItems.length ? (
            <div className={styles.pendingList}>
              {data.openFinanceItems.map((item) => (
                <div key={`${item.kind}-${item.id}`} className={styles.pendingItem}>
                  <Link href={item.href} className={styles.pendingBody}>
                    <div className={styles.pendingTitle}>{item.title}</div>
                    <div className={styles.pendingMeta}>{item.subtitle}</div>
                    <div className={styles.pendingMeta}>{item.detail}</div>
                  </Link>

                  <div className={styles.pendingButtons}>
                    <Link href={item.href} className={styles.secondaryBtn}>
                      {item.kind === 'payment' ? t.dashboard.pay : t.dashboard.view}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t.dashboard.noOpenFamilyFinanceItems}</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{t.dashboard.upcomingEvents}</h2>
            <Link href="/calendar" className={styles.cardLink}>
              {t.dashboard.viewAll}
            </Link>
          </div>

          {data.upcomingEvents.length ? (
            <div className={styles.eventList}>
              {data.upcomingEvents.map((item) => {
                const tone = getStatusTone(item.confirmationStatus, item.requiresConfirmation)

                return (
                  <Link key={String(item.id)} href={`/calendar?event=${item.id}`} className={styles.eventRow}>
                    <div className={styles.eventTime}>{format(new Date(item.startAt), 'HH:mm')}</div>

                    <div className={styles.eventBody}>
                      <div className={styles.eventTitle}>{item.title}</div>
                      <div className={styles.eventMeta}>
                        {item.childName || t.dashboard.noChild} · {getEventTypeLabel(item.eventType)}
                      </div>
                      <div className={styles.eventMeta}>
                        {format(new Date(item.startAt), 'dd.MM.yyyy HH:mm')}
                        {item.location ? ` · ${item.location}` : ''}
                      </div>
                      <div className={styles.eventMeta}>
                        <span className={`${styles.statusBadge} ${tone.className}`}>{tone.label}</span>
                      </div>
                    </div>

                    <ChevronRight size={18} className={styles.eventArrow} />
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className={styles.empty}>{t.dashboard.noUpcomingEvents}</div>
          )}
        </section>
      </div>

      {joinModalOpen && joinPreview ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setJoinModalOpen(false)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <AlertTriangle size={18} />
                <h3 className={styles.modalTitle}>{t.dashboard.joinFamily}</h3>
              </div>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                {t.dashboard.youAreAboutToJoin}{' '}
                <strong>{joinPreview.targetFamily?.name || t.dashboard.thisFamily}</strong>.
              </p>

              {joinPreview.isSameFamily ? (
                <div className={styles.modalInfo}>{t.dashboard.alreadyInThisFamily}</div>
              ) : null}

              {joinPreview.willLeaveCurrentFamily ? (
                <div className={styles.modalWarning}>
                  <div className={styles.modalWarningTitle}>{t.dashboard.warning}</div>
                  <div className={styles.modalWarningText}>
                    {t.dashboard.leaveCurrentFamilyWarningPrefix}{' '}
                    <strong>{joinPreview.currentFamily?.name || t.dashboard.yourCurrentFamily}</strong>{' '}
                    {t.dashboard.leaveCurrentFamilyWarningSuffix}
                  </div>
                </div>
              ) : null}

              <div className={styles.familyCompare}>
                <div className={styles.familyCompareCard}>
                  <div className={styles.familyCompareLabel}>{t.dashboard.currentFamily}</div>
                  <div className={styles.familyCompareValue}>
                    {joinPreview.currentFamily?.name || t.dashboard.noCurrentFamily}
                  </div>
                  <div className={styles.familyCompareMeta}>
                    {joinPreview.currentFamily?.memberCount ?? 0} {t.dashboard.members}
                  </div>
                </div>

                <div className={styles.familyCompareArrow}>→</div>

                <div className={styles.familyCompareCard}>
                  <div className={styles.familyCompareLabel}>{t.dashboard.targetFamily}</div>
                  <div className={styles.familyCompareValue}>
                    {joinPreview.targetFamily?.name || t.dashboard.unknownFamily}
                  </div>
                  <div className={styles.familyCompareMeta}>
                    {joinPreview.targetFamily?.memberCount ?? 0} {t.dashboard.members}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setJoinModalOpen(false)}>
                {t.dashboard.cancel}
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={confirmJoinFamily}
                disabled={joinPreview.isSameFamily || joinPreview.alreadyMember || actionLoading === 'join-confirm'}
              >
                {actionLoading === 'join-confirm' ? (
                  <>
                    <Loader2 size={16} className={styles.spin} />
                    {t.dashboard.joining}
                  </>
                ) : (
                  t.dashboard.confirmJoin
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}