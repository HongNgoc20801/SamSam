'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import NotificationBell from '@/app/(frontend)/components/notifications/NotificationBell'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useTranslations } from '@/app/lib/i18n/useTranslations'
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
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
  profileImage?: any
  avatar?: any
  image?: any
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
  child?: any
  handoverFrom?: any
  handoverTo?: any
  responsibleParent?: any
  confirmedBy?: any
  confirmedAt?: string
  createdBy?: any
  handoverStatus?: 'not-started' | 'delivered' | 'completed'
  handoverDeliveredAt?: string
  handoverDeliveredBy?: any
  handoverReceivedAt?: string
  handoverReceivedBy?: any
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
  child?: any
}

type EconomyRequestDoc = {
  id: string | number
  title: string
  amount: number
  category?: string
  notes?: string
  status?: 'pending' | 'approved' | 'rejected'
  child?: any
  createdBy?: any
  createdByName?: string
  createdAt?: string
}

type BankConnection = {
  id: string | number
  bankName?: string
  currentBalance?: number
  currency?: string
  status?: string
  connectionScope?: 'family' | 'personal'
}

type CustodyScheduleDoc = {
  id: string | number
  title?: string
  child?: any
  currentParent?: any
  nextParent?: any
  startAt: string
  endAt: string
  status?: 'active' | 'completed' | 'changed' | 'cancelled'
  handoverStatus?: 'not-ready' | 'ready' | 'handed-over'
  notes?: string
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
  children: ChildDashboardItem[]
  parents: ParentOption[]
  currentCustody: {
    id: string | number
    title: string
    childId: string
    childName: string
    currentParentName: string
    nextParentName: string
    currentParentId: string
    nextParentId: string
    startAt: string
    endAt: string
    status: string
    handoverStatus: string
    notes?: string
  } | null
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
    createdById: string
    handoverFromId: string
    handoverToId: string
    handoverStatus: string
    handoverDeliveredAt?: string
    handoverReceivedAt?: string
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
  const full = `${String(v?.firstName || '').trim()} ${String(v?.lastName || '').trim()}`.trim()

  return v.fullName || v.name || full || (id ? nameMap?.get(id) || '' : '') || v.email || ''
}

function getMediaUrl(value: any) {
  if (!value) return ''
  if (typeof value === 'string') return value

  return (
    value?.url ||
    value?.sizes?.thumbnail?.url ||
    value?.sizes?.card?.url ||
    value?.sizes?.small?.url ||
    ''
  )
}

function getProfileImageUrl(me: MeUser | null) {
  if (!me) return ''
  return getMediaUrl(me.profileImage) || getMediaUrl(me.avatar) || getMediaUrl(me.image)
}

function getCountdownParts(targetIso?: string, nowMs = Date.now()) {
  if (!targetIso) return null

  const target = new Date(targetIso).getTime()
  const diff = target - nowMs

  if (Number.isNaN(target) || diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
    }
  }

  const totalSeconds = Math.floor(diff / 1000)

  return {
    days: Math.floor(totalSeconds / (60 * 60 * 24)),
    hours: Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60)),
    minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const t = useTranslations()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinPreview, setJoinPreview] = useState<FamilyJoinPreview | null>(null)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [custodyOpen, setCustodyOpen] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [custodyChildId, setCustodyChildId] = useState('')
  const [custodyNextParentId, setCustodyNextParentId] = useState('')
  const [custodyStartAt, setCustodyStartAt] = useState('')
  const [custodyEndAt, setCustodyEndAt] = useState('')
  const [custodyNotes, setCustodyNotes] = useState('')
  const [editingCustodyId, setEditingCustodyId] = useState<string | number | null>(null)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [emergencyReason, setEmergencyReason] = useState('')
  const [emergencyPickupAt, setEmergencyPickupAt] = useState('')
  const [emergencyReturnAt, setEmergencyReturnAt] = useState('')
  const [emergencyCustodyId, setEmergencyCustodyId] = useState<string | number | null>(null)

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

  async function loadDashboard(showLoader = true) {
    try {
      if (showLoader) setLoading(true)
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
        custodySchedulesRes,
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
        fetch('/api/children?limit=100', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
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
        fetch('/api/custody-schedules?limit=20&sort=startAt&depth=1', {
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
      const economyTransactionsJson = economyTransactionsRes
        ? await economyTransactionsRes.json().catch(() => null)
        : null
      const economyRequestsJson = economyRequestsRes ? await economyRequestsRes.json().catch(() => null) : null
      const bankStatusJson = bankStatusRes ? await bankStatusRes.json().catch(() => null) : null
      const custodySchedulesJson = custodySchedulesRes
        ? await custodySchedulesRes.json().catch(() => null)
        : null

      if (!meRes.ok) {
        throw new Error(meJson?.message || `${t.dashboard.couldNotLoadCurrentUser} (${meRes.status})`)
      }

      if (!calendarRes.ok) {
        throw new Error(calendarJson?.message || `${t.dashboard.couldNotLoadCalendarEvents} (${calendarRes.status})`)
      }

      const mappedParents: ParentOption[] = (parentsJson?.docs ?? []).map((p: any) => ({
        id: p.id,
        fullName:
          p.fullName ||
          p.name ||
          `${String(p?.firstName || '').trim()} ${String(p?.lastName || '').trim()}`.trim() ||
          p.email ||
          `${t.dashboard.parent} ${p.id}`,
        email: p.email,
      }))

      const localParentNameById = new Map<string, string>()
      mappedParents.forEach((p) => {
        localParentNameById.set(String(p.id), p.fullName || p.email || String(p.id))
      })

      const docs: DashboardEvent[] = calendarJson?.docs ?? []
      const currentUserId = String(meJson?.user?.id || meJson?.id || '')
      const now = new Date()
      const custodyDocs: CustodyScheduleDoc[] = custodySchedulesJson?.docs ?? []

      const activeCustody =
        custodyDocs.find((item) => {
          const start = new Date(item.startAt).getTime()
          const end = new Date(item.endAt).getTime()
          const current = now.getTime()

          return (
            item.status === 'active' &&
            !Number.isNaN(start) &&
            !Number.isNaN(end) &&
            start <= current &&
            end >= current
          )
        }) ??
        custodyDocs.find((item) => item.status === 'active') ??
        null

      const upcoming = docs
        .filter((event) => new Date(event.endAt).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

      const visibleUpcoming = upcoming.filter((event) => event.confirmationStatus !== 'declined')

      const confirmableUpcoming = visibleUpcoming.filter((event) => {
        return (
          event.requiresConfirmation === true &&
          event.confirmationStatus === 'pending' &&
          getRelId(event.createdBy) !== currentUserId
        )
      })

      const upcomingHandover =
        visibleUpcoming.find(
          (event) => event.eventType === 'handover' && event.handoverStatus !== 'completed',
        ) ??
        visibleUpcoming.find((event) => event.eventType === 'handover') ??
        null

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
        .filter((item) => getRelId(item.createdBy) !== currentUserId)
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
        .filter((item) => getRelId(item.createdBy) === currentUserId)
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
        pendingRequestReviewCount: pendingRequests.filter((item) => getRelId(item.createdBy) !== currentUserId).length,
        waitingRequestCount: pendingRequests.filter((item) => getRelId(item.createdBy) === currentUserId).length,
        familyBankBalance: Number(familyBank?.currentBalance || 0),
        familyBankCurrency: familyBank?.currency || 'NOK',
      }

      const notifications: NotificationItem[] = notificationsJson?.docs ?? []
      const unreadNotifications = notifications.filter((item) => !item.readAt && !item.isRead).length

      setData({
        me: meJson?.user ?? meJson ?? null,
        unreadNotifications,
        notifications,
        children: childrenCountJson?.docs ?? [],
        parents: mappedParents,
        childCount:
          childrenCountJson?.totalDocs ??
          (Array.isArray(childrenCountJson?.docs) ? childrenCountJson.docs.length : 0),
        currentCustody: activeCustody
          ? {
              id: activeCustody.id,
              title: activeCustody.title || 'Omsorgsperiode',
              childId: getRelId(activeCustody.child),
              childName: getRelDisplayName(activeCustody.child),
              currentParentName: getRelDisplayName(activeCustody.currentParent, localParentNameById),
              nextParentName: getRelDisplayName(activeCustody.nextParent, localParentNameById),
              currentParentId: getRelId(activeCustody.currentParent),
              nextParentId: getRelId(activeCustody.nextParent),
              startAt: activeCustody.startAt,
              endAt: activeCustody.endAt,
              status: activeCustody.status || 'active',
              handoverStatus: activeCustody.handoverStatus || 'not-ready',
              notes: activeCustody.notes || '',
            }
          : null,
        upcomingHandover: upcomingHandover
          ? {
              id: upcomingHandover.id,
              title: upcomingHandover.title,
              startAt: upcomingHandover.startAt,
              endAt: upcomingHandover.endAt,
              location: upcomingHandover.location || '',
              childName: getRelDisplayName(upcomingHandover.child),
              handoverFromName: getRelDisplayName(upcomingHandover.handoverFrom, localParentNameById),
              handoverToName: getRelDisplayName(upcomingHandover.handoverTo, localParentNameById),
              responsibleParentName: getRelDisplayName(upcomingHandover.responsibleParent, localParentNameById),
              confirmationStatus: upcomingHandover.confirmationStatus || 'not-required',
              confirmedByName: getRelDisplayName(upcomingHandover.confirmedBy, localParentNameById),
              confirmedAt: upcomingHandover.confirmedAt,
              createdById: getRelId(upcomingHandover.createdBy),
              handoverFromId: getRelId(upcomingHandover.handoverFrom),
              handoverToId: getRelId(upcomingHandover.handoverTo),
              handoverStatus: upcomingHandover.handoverStatus || 'not-started',
              handoverDeliveredAt: upcomingHandover.handoverDeliveredAt,
              handoverReceivedAt: upcomingHandover.handoverReceivedAt,
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
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard(true)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDashboard(false)
      }
    }, 3000)

    const handleFocus = () => {
      loadDashboard(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard(false)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const greetingName = useMemo(() => getDisplayName(data?.me ?? null), [data?.me])

  const profileImageUrl = useMemo(() => getProfileImageUrl(data?.me ?? null), [data?.me])

  const todayEvents = useMemo(() => {
    if (!data) return []

    const todayKey = format(new Date(), 'yyyy-MM-dd')

    return data.upcomingEvents.filter(
      (item) => format(new Date(item.startAt), 'yyyy-MM-dd') === todayKey,
    )
  }, [data])

  const currentUserId = String(data?.me?.id || '')

  function renderDashboardHeader(dashboardData: DashboardData) {
    return (
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {t.dashboard.goodMorning}, {greetingName}
          </h1>
          <p className={styles.subtitle}>{t.dashboard.structuredOverviewToday}</p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.joinIconWrap}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => {
                setJoinOpen((prev) => !prev)
                setNotifOpen(false)
              }}
              aria-label={t.dashboard.joinFamily}
            >
              <UserPlus size={20} />
            </button>

            {joinOpen ? (
              <div className={styles.joinPopover}>
                <h3>{t.dashboard.joinFamily}</h3>
                <p>{t.dashboard.joinFamilyDescription}</p>

                <div className={styles.joinPopoverForm}>
                  <input
                    type="text"
                    placeholder={t.dashboard.enterInviteCode}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={20}
                  />

                  <button
                    type="button"
                    onClick={previewJoinFamily}
                    disabled={!joinCode.trim() || actionLoading === 'join-preview'}
                  >
                    {actionLoading === 'join-preview' ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : (
                      t.dashboard.joinFamily
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div onClickCapture={() => setJoinOpen(false)}>
            <NotificationBell />
          </div>

          <Link href="/profile" className={styles.profileAvatar} aria-label={t.dashboard.openProfile}>
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="" className={styles.profileAvatarImage} />
            ) : (
              String(greetingName || '?').charAt(0).toUpperCase()
            )}
          </Link>
        </div>
      </header>
    )
  }

  async function handleConfirmation(eventId: string | number, nextStatus: 'confirmed' | 'declined') {
    try {
      setError('')
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
        throw new Error(json?.message || json?.errors?.[0]?.message || raw || t.dashboard.couldNotUpdateConfirmation)
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
      setJoinOpen(false)
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

  async function createCustodySchedule() {
    try {
      setError('')
      setActionLoading('custody-create')

      const childId = String(custodyChildId || '')
      const nextParentId = String(custodyNextParentId || '')
      const currentParentId = String(data?.me?.id || '')

      if (!childId) throw new Error('Velg barn.')
      if (!currentParentId) throw new Error('Mangler innlogget bruker.')
      if (!nextParentId) throw new Error('Velg neste forelder.')
      if (currentParentId === nextParentId) throw new Error('Neste forelder kan ikke være deg selv.')
      if (!custodyStartAt) throw new Error('Velg startdato.')
      if (!custodyEndAt) throw new Error('Velg sluttdato.')

      const payload = {
        child: Number(childId),
        currentParent: Number(currentParentId),
        nextParent: Number(nextParentId),
        startAt: new Date(custodyStartAt).toISOString(),
        endAt: new Date(custodyEndAt).toISOString(),
        notes: custodyNotes,
      }

      const res = await fetch('/api/custody-schedules', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          json?.errors?.[0]?.message || json?.message || raw || 'Kunne ikke opprette omsorgsperiode.',
        )
      }

      setCustodyOpen(false)
      setCustodyChildId('')
      setCustodyNextParentId('')
      setCustodyStartAt('')
      setCustodyEndAt('')
      setCustodyNotes('')

      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke opprette omsorgsperiode.')
    } finally {
      setActionLoading('')
    }
  }

  async function updateCustodySchedule() {
    try {
      if (!editingCustodyId) return

      setError('')
      setActionLoading('custody-create')

      if (!custodyStartAt) throw new Error('Velg startdato.')
      if (!custodyEndAt) throw new Error('Velg sluttdato.')

      const payload = {
        startAt: new Date(custodyStartAt).toISOString(),
        endAt: new Date(custodyEndAt).toISOString(),
        notes: custodyNotes,
      }

      const res = await fetch(`/api/custody-schedules/${editingCustodyId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const raw = await res.text()
      let json: any = null

      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) throw new Error(json?.message || raw || 'Kunne ikke oppdatere omsorgsperiode.')

      setCustodyOpen(false)
      setEditingCustodyId(null)
      setCustodyChildId('')
      setCustodyNextParentId('')
      setCustodyStartAt('')
      setCustodyEndAt('')
      setCustodyNotes('')

      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke oppdatere omsorgsperiode.')
    } finally {
      setActionLoading('')
    }
  }

  async function markCustodyReady(id: string | number) {
    try {
      setError('')
      setActionLoading(`custody-ready-${id}`)

      const res = await fetch(`/api/custody-schedules/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverStatus: 'ready',
        }),
      })

      if (!res.ok) {
        const raw = await res.text()
        throw new Error(raw || 'Kunne ikke sette klar for bytte.')
      }

      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Feil ved klar for bytte.')
    } finally {
      setActionLoading('')
    }
  }

  async function confirmCustodyReceived(id: string | number) {
    try {
      setError('')
      setActionLoading(`custody-received-${id}`)

      const res = await fetch(`/api/custody-schedules/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoverStatus: 'handed-over',
          status: 'completed',
        }),
      })

      if (!res.ok) {
        const raw = await res.text()
        throw new Error(raw || 'Kunne ikke bekrefte mottak.')
      }

      await loadDashboard()

      const current = data?.currentCustody

      setCustodyChildId(
        data?.children.find((c) => c.fullName === current?.childName)?.id?.toString() || '',
      )
      setCustodyNextParentId(current?.currentParentId || '')
      setCustodyStartAt(new Date().toISOString().slice(0, 16))
      setCustodyEndAt('')
      setCustodyNotes('')
      setEditingCustodyId(null)
      setCustodyOpen(true)
    } catch (err: any) {
      setError(err?.message || 'Feil ved mottak.')
    } finally {
      setActionLoading('')
    }
  }

  async function deleteCustodySchedule(id: string | number) {
    try {
      const confirmed = window.confirm('Er du sikker på at du vil slette omsorgsperioden?')
      if (!confirmed) return

      setError('')
      setActionLoading(`custody-delete-${id}`)

      const res = await fetch(`/api/custody-schedules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const raw = await res.text()

      if (!res.ok) throw new Error(raw || 'Kunne ikke slette omsorgsperiode.')

      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke slette omsorgsperiode.')
    } finally {
      setActionLoading('')
    }
  }

  async function requestEmergencyCustodyChange() {
    try {
      if (!emergencyCustodyId) return
      if (!emergencyReason.trim()) throw new Error('Skriv hvorfor du trenger hastebytte.')
      if (!emergencyPickupAt) throw new Error('Velg når barnet skal hentes.')
      if (!emergencyReturnAt) throw new Error('Velg hvor lenge hastebyttet skal vare.')

      const pickupDate = new Date(emergencyPickupAt)
      const returnDate = new Date(emergencyReturnAt)

      if (Number.isNaN(pickupDate.getTime())) throw new Error('Ugyldig hentetidspunkt.')
      if (Number.isNaN(returnDate.getTime())) throw new Error('Ugyldig sluttidspunkt.')
      if (returnDate <= pickupDate) throw new Error('Sluttidspunkt må være etter hentetidspunkt.')

      const current = data?.currentCustody
      if (!current) throw new Error('Fant ingen aktiv omsorgsperiode.')
      if (!current.childId) throw new Error('Mangler barn for hastebytte.')

      setError('')
      setActionLoading(`custody-emergency-${emergencyCustodyId}`)

      const res = await fetch('/api/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: Number(current.nextParentId),
          title: 'Hastebytte forespurt',
          message: emergencyReason.trim(),
          type: 'calendar',
          event: 'updated',
          link: '/notifications',
          meta: {
            type: 'custody-emergency',
            custodyId: emergencyCustodyId,
            childId: current.childId,
            actorId: data?.me?.id,
            actorName: getDisplayName(data?.me ?? null),
            actorAvatarUrl: getProfileImageUrl(data?.me ?? null),
            childName: current.childName,
            currentParentName: current.currentParentName,
            nextParentName: current.nextParentName,
            startAt: current.startAt,
            endAt: current.endAt,
            pickupAt: pickupDate.toISOString(),
            returnAt: returnDate.toISOString(),
            reason: emergencyReason.trim(),
          },
        }),
      })

      const raw = await res.text()

      if (!res.ok) throw new Error(raw || 'Kunne ikke sende hastebytte.')

      setEmergencyOpen(false)
      setEmergencyReason('')
      setEmergencyPickupAt('')
      setEmergencyReturnAt('')
      setEmergencyCustodyId(null)
      window.alert('Hastebytte er sendt.')
      await loadDashboard()
    } catch (err: any) {
      setError(err?.message || 'Feil ved hastebytte.')
    } finally {
      setActionLoading('')
    }
  }

  function renderJoinFamilyModal() {
    if (!joinModalOpen || !joinPreview) return null

    return (
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
    )
  }

  function renderCustodyModal() {
    if (!custodyOpen || !data) return null

    return (
      <div className={styles.modalBackdrop} onMouseDown={() => setCustodyOpen(false)}>
        <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitleRow}>
              <Users size={18} />
              <h3 className={styles.modalTitle}>
                {editingCustodyId ? 'Rediger omsorgsperiode' : 'Opprett omsorgsperiode'}
              </h3>
            </div>
          </div>

          <div className={styles.custodyForm}>
            <label>
              Barn
              <select value={custodyChildId} onChange={(e) => setCustodyChildId(e.target.value)}>
                <option value="">Velg barn</option>
                {data.children.map((child) => (
                  <option key={String(child.id)} value={String(child.id)}>
                    {child.fullName || `Barn ${child.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Neste forelder
              <select value={custodyNextParentId} onChange={(e) => setCustodyNextParentId(e.target.value)}>
                <option value="">Velg forelder</option>
                {data.parents
                  .filter((parent) => String(parent.id) !== String(data.me?.id))
                  .map((parent) => (
                    <option key={String(parent.id)} value={String(parent.id)}>
                      {parent.fullName}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Start
              <input
                type="datetime-local"
                value={custodyStartAt}
                onChange={(e) => setCustodyStartAt(e.target.value)}
              />
            </label>

            <label>
              Slutt
              <input
                type="datetime-local"
                value={custodyEndAt}
                onChange={(e) => setCustodyEndAt(e.target.value)}
              />
            </label>

            <label>
              Notat
              <textarea
                value={custodyNotes}
                onChange={(e) => setCustodyNotes(e.target.value)}
                placeholder="Valgfritt notat"
              />
            </label>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setCustodyOpen(false)}>
              Avbryt
            </button>

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={editingCustodyId ? updateCustodySchedule : createCustodySchedule}
              disabled={actionLoading === 'custody-create'}
            >
              {actionLoading === 'custody-create' ? (
                <>
                  <Loader2 size={16} className={styles.spin} />
                  {editingCustodyId ? 'Lagrer' : 'Oppretter'}
                </>
              ) : editingCustodyId ? (
                'Lagre'
              ) : (
                'Opprett'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderEmergencyModal() {
    if (!emergencyOpen || !data) return null

    return (
      <div className={styles.modalBackdrop} onMouseDown={() => setEmergencyOpen(false)}>
        <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitleRow}>
              <AlertTriangle size={18} />
              <h3 className={styles.modalTitle}>Be om hastebytte</h3>
            </div>
          </div>

          <div className={styles.modalBody}>
            <p className={styles.modalText}>
              Send en forespørsel til den andre forelderen om å endre omsorgsperioden raskt.
            </p>

            <div className={styles.custodyForm}>
              <label>
                Barn
                <input value={data.currentCustody?.childName || ''} disabled />
              </label>

              <label>
                Mottaker
                <input value={data.currentCustody?.nextParentName || ''} disabled />
              </label>

              <label>
                Når skal barnet hentes?
                <input
                  type="datetime-local"
                  value={emergencyPickupAt}
                  onChange={(e) => setEmergencyPickupAt(e.target.value)}
                />
              </label>

              <label>
                Hvor lenge skal du ha barnet?
                <input
                  type="datetime-local"
                  value={emergencyReturnAt}
                  onChange={(e) => setEmergencyReturnAt(e.target.value)}
                />
              </label>

              <label>
                Begrunnelse
                <textarea
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Skriv hvorfor du trenger hastebytte..."
                />
              </label>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                setEmergencyOpen(false)
                setEmergencyReason('')
                setEmergencyCustodyId(null)
              }}
            >
              Avbryt
            </button>

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={requestEmergencyCustodyChange}
              disabled={
                !emergencyReason.trim() ||
                !emergencyPickupAt ||
                !emergencyReturnAt ||
                actionLoading === `custody-emergency-${emergencyCustodyId}`
              }
            >
              {actionLoading === `custody-emergency-${emergencyCustodyId}` ? (
                <>
                  <Loader2 size={16} className={styles.spin} />
                  Sender
                </>
              ) : (
                'Send forespørsel'
              )}
            </button>
          </div>
        </div>
      </div>
    )
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

  if (data.childCount === 0) {
    return (
      <div className={styles.wrapper}>
        {renderDashboardHeader(data)}

        {error ? <div className={styles.inlineError}>{error}</div> : null}

        <section className={styles.childOnlyEmpty}>
          <div className={styles.childOnlyIcon}>
            <Users size={28} />
          </div>

          <div>
            <span className={styles.childOnlyEyebrow}>Samsam</span>
            <h2>{t.dashboard.noChildProfileYet}</h2>
            <p>{t.dashboard.noChildProfileDescription}</p>
          </div>

          <Link href="/child-info/new">{t.dashboard.createChildProfile}</Link>
        </section>

        {renderJoinFamilyModal()}
      </div>
    )
  }

  const isCurrentCustodyParent = data.currentCustody?.currentParentId === currentUserId
  const isNextCustodyParent = data.currentCustody?.nextParentId === currentUserId
  const custodyCountdown = getCountdownParts(data.currentCustody?.endAt, nowTick)

  return (
    <div className={styles.wrapper}>
      {renderDashboardHeader(data)}

      {error ? <div className={styles.inlineError}>{error}</div> : null}

      <main className={styles.dashboardLayout}>
        <section className={styles.custodyCard}>
          {data.currentCustody ? (
            <>
              <div className={styles.custodyContent}>
                <span className={styles.custodyEyebrow}>
                  <Users size={13} />
                  Omsorgsperiode nå
                </span>

                <h2>
                  {data.currentCustody.childName || 'Barnet'} er hos{' '}
                  {isCurrentCustodyParent ? 'deg' : data.currentCustody.currentParentName || 'forelder'}
                </h2>

                <p>
                  Neste bytte er til <strong>{data.currentCustody.nextParentName || 'andre forelder'}</strong>
                </p>

                <div className={styles.custodyDates}>
                  <div className={styles.custodyDateItem}>
                    <CalendarDays size={18} />
                    <span>{format(new Date(data.currentCustody.startAt), 'dd.MM.yyyy')}</span>
                  </div>

                  <div className={styles.custodyLine}>
                    <span />
                  </div>

                  <div className={styles.custodyDateItem}>
                    <span>{format(new Date(data.currentCustody.endAt), 'dd.MM.yyyy')}</span>
                    <CalendarDays size={18} />
                  </div>
                </div>

                {data.currentCustody.notes ? (
                  <div className={styles.custodyNoteBox}>
                    <FileText size={16} />
                    <span>Notat: {data.currentCustody.notes}</span>
                  </div>
                ) : null}
              </div>

              <div className={styles.custodySide}>
                <div className={styles.custodyCountdown}>
                  <span className={styles.countdownLabel}>Slutter om</span>
                  <strong className={styles.countdownDays}>{custodyCountdown?.days ?? 0}</strong>
                  <small className={styles.countdownDaysText}>DAGER</small>
                  <div className={styles.countdownDivider} />

                  <div className={styles.custodyCountdownDetails}>
                    <div className={styles.countdownBox}>
                      <b>{String(custodyCountdown?.hours ?? 0).padStart(2, '0')}</b>
                      <small>TIMER</small>
                    </div>

                    <div className={styles.countdownBox}>
                      <b>{String(custodyCountdown?.minutes ?? 0).padStart(2, '0')}</b>
                      <small>MIN</small>
                    </div>

                    <div className={styles.countdownBox}>
                      <b>{String(custodyCountdown?.seconds ?? 0).padStart(2, '0')}</b>
                      <small>SEK</small>
                    </div>
                  </div>
                </div>

                {isCurrentCustodyParent && data.currentCustody.handoverStatus === 'not-ready' ? (
                  <button
                    type="button"
                    className={styles.completeBtn}
                    onClick={() => markCustodyReady(data.currentCustody!.id)}
                    disabled={actionLoading === `custody-ready-${data.currentCustody.id}`}
                  >
                    <Check size={16} />
                    {actionLoading === `custody-ready-${data.currentCustody.id}` ? 'Lagrer...' : 'Klar for bytte'}
                  </button>
                ) : null}

                {isNextCustodyParent && data.currentCustody.handoverStatus === 'ready' ? (
                  <button
                    type="button"
                    className={styles.completeBtn}
                    onClick={() => confirmCustodyReceived(data.currentCustody!.id)}
                    disabled={actionLoading === `custody-received-${data.currentCustody.id}`}
                  >
                    <Check size={16} />
                    {actionLoading === `custody-received-${data.currentCustody.id}` ? 'Bekrefter...' : 'Bekreft mottak'}
                  </button>
                ) : null}

                {!isCurrentCustodyParent && !(isNextCustodyParent && data.currentCustody.handoverStatus === 'ready') ? (
                  <div className={styles.custodyWaitingBox}>
                    {isNextCustodyParent
                      ? `Du får barnet om ${custodyCountdown?.days ?? 0} dager`
                      : 'Du kan se denne omsorgsperioden'}
                  </div>
                ) : null}

                {isCurrentCustodyParent ? (
                  <div className={styles.custodyIconActions}>
                    <button
                      type="button"
                      aria-label="Rediger omsorgsperiode"
                      title="Rediger omsorgsperiode"
                      className={styles.roundEditBtn}
                      onClick={() => {
                        setEditingCustodyId(data.currentCustody!.id)

                        const currentChild = data.children.find(
                          (child) => child.fullName === data.currentCustody!.childName,
                        )

                        const currentNextParent = data.parents.find(
                          (parent) => parent.fullName === data.currentCustody!.nextParentName,
                        )

                        setCustodyChildId(currentChild ? String(currentChild.id) : '')
                        setCustodyNextParentId(currentNextParent ? String(currentNextParent.id) : '')
                        setCustodyStartAt(data.currentCustody!.startAt.slice(0, 16))
                        setCustodyEndAt(data.currentCustody!.endAt.slice(0, 16))
                        setCustodyNotes(data.currentCustody!.notes || '')
                        setCustodyOpen(true)
                      }}
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      type="button"
                      aria-label="Slett omsorgsperiode"
                      title="Slett omsorgsperiode"
                      className={styles.roundDeleteBtn}
                      onClick={() => deleteCustodySchedule(data.currentCustody!.id)}
                      disabled={actionLoading === `custody-delete-${data.currentCustody.id}`}
                    >
                      <Trash2 size={18} />
                    </button>

                    <button
                      type="button"
                      className={styles.roundEditBtn}
                      onClick={() => {
                        setEmergencyCustodyId(data.currentCustody!.id)
                        setEmergencyReason('')
                        setEmergencyPickupAt('')
                        setEmergencyReturnAt('')
                        setEmergencyOpen(true)
                      }}
                      disabled={actionLoading === `custody-emergency-${data.currentCustody.id}`}
                      aria-label="Be om hastebytte"
                      title="Be om hastebytte"
                    >
                      !
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className={styles.custodyContent}>
                <span className={styles.custodyEyebrow}>
                  <Users size={13} />
                  Omsorgsperiode
                </span>

                <h2>Ingen aktiv omsorgsperiode</h2>

                <p>
                  Opprett en omsorgsperiode for å vise hvem barnet er hos akkurat nå,
                  og når neste bytte skjer.
                </p>
              </div>

              <button
                type="button"
                className={styles.completeBtn}
                onClick={() => {
                  const firstChild = data.children?.[0]
                  const otherParent = data.parents?.find(
                    (parent) => String(parent.id) !== String(data.me?.id),
                  )

                  setCustodyChildId(firstChild ? String(firstChild.id) : '')
                  setCustodyNextParentId(otherParent ? String(otherParent.id) : '')
                  setCustodyOpen(true)
                }}
              >
                Opprett omsorgsperiode
              </button>
            </>
          )}
        </section>

        <section className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>{t.dashboard.needsYourDecision}</h2>
              <Link href="/notifications">{t.dashboard.viewAll}</Link>
            </div>

            {data.decisionActions.length ? (
              <div className={styles.decisionList}>
                {data.decisionActions.slice(0, 4).map((item) => (
                  <div key={`${item.kind}-${item.id}`} className={styles.decisionItem}>
                    <Link href={item.href} className={styles.decisionBody}>
                      <div className={styles.decisionIcon}>
                        {item.kind === 'request-review' ? (
                          <Wallet size={17} />
                        ) : item.kind === 'child' ? (
                          <Users size={17} />
                        ) : (
                          <CalendarDays size={17} />
                        )}
                      </div>

                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle || item.detail}</span>
                      </div>
                    </Link>

                    {item.kind === 'event' ? (
                      <div className={styles.decisionButtons}>
                        <button
                          type="button"
                          aria-label={t.dashboard.decline}
                          className={styles.smallRejectBtn}
                          onClick={() => handleConfirmation(item.id, 'declined')}
                          disabled={actionLoading === `confirm-${item.id}-declined`}
                        >
                          {actionLoading === `confirm-${item.id}-declined` ? (
                            <Loader2 size={15} className={styles.spin} />
                          ) : (
                            <X size={17} />
                          )}
                        </button>

                        <button
                          type="button"
                          aria-label={t.dashboard.accept}
                          className={styles.smallAcceptBtn}
                          onClick={() => handleConfirmation(item.id, 'confirmed')}
                          disabled={actionLoading === `confirm-${item.id}-confirmed`}
                        >
                          {actionLoading === `confirm-${item.id}-confirmed` ? (
                            <Loader2 size={15} className={styles.spin} />
                          ) : (
                            <Check size={17} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <Link href={item.href} className={styles.reviewBtn}>
                        {t.dashboard.review}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>{t.dashboard.allCaughtUp}</div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>{t.dashboard.todaysTimeline}</h2>
              <span>{format(new Date(), 'EEEE, MMM d')}</span>
            </div>

            {todayEvents.length ? (
              <div className={styles.timeline}>
                {todayEvents.slice(0, 4).map((item, index) => (
                  <Link key={String(item.id)} href={`/calendar?event=${item.id}`} className={styles.timelineItem}>
                    <div className={`${styles.timelineDot} ${index > 0 ? styles.timelineDotMuted : ''}`} />

                    <div className={styles.timelineBody}>
                      <strong>{format(new Date(item.startAt), 'hh:mm a')}</strong>
                      <span>{item.title}</span>
                      <small>{item.location || getEventTypeLabel(item.eventType)}</small>
                    </div>

                    <em>
                      {item.confirmationStatus === 'confirmed'
                        ? t.dashboard.confirmed
                        : item.requiresConfirmation
                          ? t.dashboard.needsConfirmation
                          : ''}
                    </em>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>{t.dashboard.noUpcomingEvents}</div>
            )}
          </section>
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.quickActions}>
            <div className={styles.cardHeader}>
              <h2>{t.dashboard.quickActions}</h2>
            </div>

            <div className={styles.quickGrid}>
              <Link href="/calendar" className={`${styles.quickAction} ${styles.quickActionPrimary}`}>
                <Plus size={22} />
                <span>{t.dashboard.addCalendarEvent}</span>
              </Link>

              <Link href="/economy" className={styles.quickAction}>
                <Receipt size={22} />
                <span>{t.dashboard.openEconomy}</span>
              </Link>

              <Link href="/child-info" className={styles.quickAction}>
                <Users size={22} />
                <span>{t.dashboard.openChildProfiles}</span>
              </Link>

              <Link href="/oppdateringer" className={styles.quickAction}>
                <FileText size={22} />
                <span>{t.dashboard.updatesPost}</span>
              </Link>
            </div>
          </section>

          <section className={styles.financeCard}>
            <div className={styles.cardHeader}>
              <h2>{t.dashboard.familyFinanceOverview}</h2>
              <Link href="/economy">{t.dashboard.viewAll}</Link>
            </div>

            <div className={styles.financeBalance}>
              <span>{t.dashboard.sharedBalance}</span>
              <strong>
                {fmtCurrency(data.financeOverview.familyBankBalance, data.financeOverview.familyBankCurrency)}
              </strong>
            </div>

            <div className={styles.financeRows}>
              <div>
                <span>{t.dashboard.requestsToReview}</span>
                <strong>{data.financeOverview.pendingRequestReviewCount}</strong>
              </div>

              <div>
                <span>{t.dashboard.pendingPayments}</span>
                <strong>
                  {fmtCurrency(data.financeOverview.pendingPaymentTotal, data.financeOverview.familyBankCurrency)}
                </strong>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>{t.dashboard.upcomingEvents}</h2>
              <Link href="/calendar">{t.dashboard.viewAll}</Link>
            </div>

            {data.upcomingEvents.length ? (
              <div className={styles.eventList}>
                {data.upcomingEvents.slice(0, 5).map((item) => (
                  <Link key={String(item.id)} href={`/calendar?event=${item.id}`} className={styles.eventItem}>
                    <div className={styles.eventDate}>
                      <span>{format(new Date(item.startAt), 'MMM')}</span>
                      <strong>{format(new Date(item.startAt), 'dd')}</strong>
                    </div>

                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {format(new Date(item.startAt), 'hh:mm a')}
                        {item.location ? ` · ${item.location}` : ''}
                      </span>
                    </div>

                    <ChevronRight size={16} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>{t.dashboard.noUpcomingEvents}</div>
            )}
          </section>
        </aside>
      </main>

      {renderCustodyModal()}
      {renderEmergencyModal()}
      {renderJoinFamilyModal()}
    </div>
  )
}
