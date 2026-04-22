'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './economy.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'
import { useSettings } from '@/app/(frontend)/components/providers/SettingsProvider'

type SelectableBankAccount = {
  externalAccountId: string
  bankName: string
  accountName: string
  maskedAccount: string
  currency: string
}

type BankConnection = {
  id: string | number
  bankName?: string
  accountName?: string
  maskedAccount?: string
  currentBalance?: number
  currency?: string
  status?: 'not_connected' | 'pending' | 'connected' | 'expired' | 'failed' | string
  connectionScope?: 'family' | 'personal'
  lastSyncedAt?: string
  meta?: {
    availableAccounts?: SelectableBankAccount[]
    selectionRequired?: boolean
    selectedAccount?: SelectableBankAccount
  }
}

type MeUser = {
  id: string | number
  firstName?: string
  lastName?: string
  email?: string
}

type TransferDoc = {
  id: string | number
  amount: number
  currency?: string
  note?: string
  status?: string
  createdAt?: string
  initiatedByName?: string
}

type ChildOption = {
  id: string | number
  fullName: string
}

type EconomyRequestDoc = {
  id: string | number
  title: string
  amount: number
  category?: string
  notes?: string
  status?: 'pending' | 'approved' | 'rejected'
  child?: string | number | { id: string | number }
  createdBy?: string | number | { id: string | number }
  createdByName?: string
  decisionNote?: string
  createdAt?: string
  reviewedAt?: string
}

type EconomyTransactionDoc = {
  id: string | number
  title: string
  description?: string
  amount: number
  currency?: string
  status?: 'paid' | 'pending'
  type?: 'expense' | 'income'
  category?: string
  transactionDate?: string
  updatedAt?: string
  createdAt?: string
  child?: string | number | { id: string | number }
  sourceType?: 'payment' | 'request'
  requestRef?: string | number | { id: string | number }
  requestCreatedByName?: string
  approvedByName?: string
  paidFromScope?: 'family' | 'personal'
}

type BankConnectionStatus = 'not_connected' | 'pending' | 'connected' | 'expired' | 'failed'
type ConnectedBankConnection = BankConnection & { status: 'connected' }

type PieSide = 'left' | 'right'
type PieTextAnchor = 'start' | 'end'

function getBankStatus(connection: BankConnection | null): BankConnectionStatus {
  const status = String(connection?.status || '')
    .trim()
    .toLowerCase()

  if (status === 'pending') return 'pending'
  if (status === 'connected') return 'connected'
  if (status === 'expired') return 'expired'
  if (status === 'failed') return 'failed'
  return 'not_connected'
}

function isConnectedBank(
  connection: BankConnection | null,
): connection is ConnectedBankConnection {
  return getBankStatus(connection) === 'connected'
}

function needsAccountSelection(connection: BankConnection | null) {
  return (
    getBankStatus(connection) === 'pending' &&
    Array.isArray(connection?.meta?.availableAccounts) &&
    connection.meta.availableAccounts.length > 0 &&
    connection.meta.selectionRequired !== false
  )
}

function getDateParts(value?: string) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null

  return {
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
    time: d.getTime(),
  }
}

function matchesMonthYear(value: string | undefined, month: string, year: string) {
  const parts = getDateParts(value)
  if (!parts) return false

  const monthOk = month === 'all' || parts.month === month
  const yearOk = year === 'all' || parts.year === year

  return monthOk && yearOk
}

function buildMonthOptions(values: Array<string | undefined>, monthLabels: string[]) {
  const set = new Set<string>()

  values.forEach((value) => {
    const parts = getDateParts(value)
    if (parts) set.add(parts.month)
  })

  return Array.from(set)
    .sort((a, b) => Number(a) - Number(b))
    .map((value) => ({
      value,
      label: monthLabels[Number(value) - 1] || value,
    }))
}

function buildYearOptions(values: Array<string | undefined>) {
  const set = new Set<string>()

  values.forEach((value) => {
    const parts = getDateParts(value)
    if (parts) set.add(parts.year)
  })

  return Array.from(set).sort((a, b) => Number(b) - Number(a))
}

const PIE_COLOR_CLASSES = [
  'pieColor1',
  'pieColor2',
  'pieColor3',
  'pieColor4',
  'pieColor5',
  'pieColor6',
  'pieColor7',
  'pieColor8',
]

const PIE_CX = 200
const PIE_CY = 110
const PIE_RADIUS = 78
const PIE_OUTER_RADIUS = 86

function getSelectableAccounts(connection: BankConnection | null) {
  return Array.isArray(connection?.meta?.availableAccounts)
    ? connection.meta.availableAccounts
    : []
}

function toDateInputValue(d = new Date()) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

function describePieSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

function distributeLabelY<T extends { targetY: number }>(
  items: T[],
  minY: number,
  maxY: number,
  gap: number,
) {
  const placed = [...items]
    .sort((a, b) => a.targetY - b.targetY)
    .map((item) => ({
      ...item,
      finalY: item.targetY,
    }))

  for (let i = 0; i < placed.length; i++) {
    if (i === 0) {
      placed[i].finalY = Math.max(minY, placed[i].finalY)
    } else {
      placed[i].finalY = Math.max(placed[i].finalY, placed[i - 1].finalY + gap)
    }
  }

  for (let i = placed.length - 1; i >= 0; i--) {
    if (i === placed.length - 1) {
      placed[i].finalY = Math.min(maxY, placed[i].finalY)
    } else {
      placed[i].finalY = Math.min(placed[i].finalY, placed[i + 1].finalY - gap)
    }
  }

  return placed
}

export default function EconomyPage() {
  const t = useTranslations()
  const te = t.economy
  const { settings } = useSettings()
  const searchParams = useSearchParams()

  const locale = settings?.language === 'en' ? 'en-GB' : 'nb-NO'

  const monthLabels = [
    te.monthJanuary,
    te.monthFebruary,
    te.monthMarch,
    te.monthApril,
    te.monthMay,
    te.monthJune,
    te.monthJuly,
    te.monthAugust,
    te.monthSeptember,
    te.monthOctober,
    te.monthNovember,
    te.monthDecember,
  ]

  const categoryLabels: Record<string, string> = {
    food: te.categoryFood,
    housing: te.categoryHousing,
    transport: te.categoryTransport,
    health: te.categoryHealth,
    school: te.categorySchool,
    activities: te.categoryActivities,
    clothes: te.categoryClothes,
    bills: te.categoryBills,
    other: te.categoryOther,
  }

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

  function fmtDateTime(v?: string) {
    if (!v) return '—'

    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '—'

    return d.toLocaleString(locale, {
      timeZone: 'Europe/Oslo',
    })
  }

  function fmtDateOnly(v?: string) {
    if (!v) return '—'

    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '—'

    return d.toLocaleDateString(locale, {
      timeZone: 'Europe/Oslo',
    })
  }

  function getBankStatusLabel(status: BankConnectionStatus) {
    if (status === 'connected') return te.bankStatusConnected
    if (status === 'pending') return te.bankStatusPending
    if (status === 'failed') return te.bankStatusFailed
    if (status === 'expired') return te.bankStatusExpired
    return te.bankStatusNotConnected
  }

  function getCategoryLabel(category?: string) {
    const key = String(category || 'other').trim().toLowerCase()
    return categoryLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)
  }

  function getFullName(me: MeUser | null) {
    if (!me) return te.my
    const full = `${String(me.firstName || '').trim()} ${String(me.lastName || '').trim()}`.trim()
    return full || te.my
  }

  function getRelationId(value: any) {
    if (value == null) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (typeof value === 'object' && value.id != null) return String(value.id)
    return ''
  }

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [me, setMe] = useState<MeUser | null>(null)
  const [familyBank, setFamilyBank] = useState<BankConnection | null>(null)
  const [personalBank, setPersonalBank] = useState<BankConnection | null>(null)
  const [transfers, setTransfers] = useState<TransferDoc[]>([])
  const [economyTransactions, setEconomyTransactions] = useState<EconomyTransactionDoc[]>([])
  const [children, setChildren] = useState<ChildOption[]>([])
  const [requests, setRequests] = useState<EconomyRequestDoc[]>([])

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [transferFromScope, setTransferFromScope] = useState<'family' | 'personal'>('personal')
  const [transferToScope, setTransferToScope] = useState<'family' | 'personal'>('family')
  const [showTransferModal, setShowTransferModal] = useState(false)

  const [paymentTitle, setPaymentTitle] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCategory, setPaymentCategory] = useState('bills')
  const [paymentChildId, setPaymentChildId] = useState('')
  const [paymentDueDate, setPaymentDueDate] = useState(toDateInputValue())
  const [paymentDescription, setPaymentDescription] = useState('')

  const [payTarget, setPayTarget] = useState<EconomyTransactionDoc | null>(null)
  const [payStep, setPayStep] = useState<'confirm' | 'select'>('confirm')
  const [payBankScope, setPayBankScope] = useState<'family' | 'personal'>('family')
  const [payError, setPayError] = useState('')

  const [showAllPaid, setShowAllPaid] = useState(false)
  const [showAllTransfers, setShowAllTransfers] = useState(false)

  const [paidMonthFilter, setPaidMonthFilter] = useState('all')
  const [paidYearFilter, setPaidYearFilter] = useState('all')
  const [transferMonthFilter, setTransferMonthFilter] = useState('all')
  const [transferYearFilter, setTransferYearFilter] = useState('all')
  const [showBankPanel, setShowBankPanel] = useState(false)

  const [showRequestPanel, setShowRequestPanel] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)

  const [requestTitle, setRequestTitle] = useState('')
  const [requestAmount, setRequestAmount] = useState('')
  const [requestCategory, setRequestCategory] = useState('other')
  const [requestChildId, setRequestChildId] = useState('')
  const [requestNotes, setRequestNotes] = useState('')

  const [approveTarget, setApproveTarget] = useState<EconomyRequestDoc | null>(null)
  const [approveBankScope, setApproveBankScope] = useState<'family' | 'personal'>('family')
  const [approveError, setApproveError] = useState('')

  const [monthlyBudget, setMonthlyBudget] = useState<number>(0)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const paidListRef = useRef<HTMLDivElement | null>(null)
  const transferListRef = useRef<HTMLDivElement | null>(null)

  const fullName = useMemo(() => getFullName(me), [me])
  const familyStatus = getBankStatus(familyBank)
  const personalStatus = getBankStatus(personalBank)

  const dashboardMonth = useMemo(() => {
    return new Date().toLocaleDateString(locale, { month: 'long' })
  }, [locale])

  const dashboardYear = useMemo(() => {
    return String(new Date().getFullYear())
  }, [])

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
    })
  }, [locale])

  const childNameById = useMemo(() => {
    const map = new Map<string, string>()
    children.forEach((child) => {
      map.set(String(child.id), child.fullName)
    })
    return map
  }, [children])

  const pendingPayments = useMemo(() => {
    return [...economyTransactions]
      .filter((item) => item.type === 'expense' && item.status === 'pending')
      .sort((a, b) => {
        const da = new Date(a.transactionDate || 0).getTime()
        const db = new Date(b.transactionDate || 0).getTime()
        return da - db
      })
  }, [economyTransactions])

  const allPaidPayments = useMemo(() => {
    return [...economyTransactions]
      .filter((item) => item.type === 'expense' && item.status === 'paid')
      .sort((a, b) => {
        const da = new Date(a.updatedAt || a.transactionDate || 0).getTime()
        const db = new Date(b.updatedAt || b.transactionDate || 0).getTime()
        return db - da
      })
  }, [economyTransactions])

  const paidMonthOptions = useMemo(() => {
    return buildMonthOptions(
      allPaidPayments.map((item) => item.updatedAt || item.transactionDate),
      monthLabels,
    )
  }, [allPaidPayments, monthLabels])

  const paidYearOptions = useMemo(() => {
    return buildYearOptions(allPaidPayments.map((item) => item.updatedAt || item.transactionDate))
  }, [allPaidPayments])

  const filteredPaidPayments = useMemo(() => {
    return allPaidPayments.filter((item) =>
      matchesMonthYear(item.updatedAt || item.transactionDate, paidMonthFilter, paidYearFilter),
    )
  }, [allPaidPayments, paidMonthFilter, paidYearFilter])

  const visiblePaidPayments = useMemo(() => {
    return showAllPaid ? filteredPaidPayments : filteredPaidPayments.slice(0, 3)
  }, [filteredPaidPayments, showAllPaid])

  const sortedTransfers = useMemo(() => {
    return [...transfers].sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime()
      const db = new Date(b.createdAt || 0).getTime()
      return db - da
    })
  }, [transfers])

  const transferMonthOptions = useMemo(() => {
    return buildMonthOptions(sortedTransfers.map((item) => item.createdAt), monthLabels)
  }, [sortedTransfers, monthLabels])

  const transferYearOptions = useMemo(() => {
    return buildYearOptions(sortedTransfers.map((item) => item.createdAt))
  }, [sortedTransfers])

  const filteredTransfers = useMemo(() => {
    return sortedTransfers.filter((item) =>
      matchesMonthYear(item.createdAt, transferMonthFilter, transferYearFilter),
    )
  }, [sortedTransfers, transferMonthFilter, transferYearFilter])

  const visibleTransfers = useMemo(() => {
    return showAllTransfers ? filteredTransfers : filteredTransfers.slice(0, 3)
  }, [filteredTransfers, showAllTransfers])

  const pendingRequests = useMemo(() => {
    return [...requests]
      .filter((item) => item.status === 'pending')
      .sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime()
        const db = new Date(b.createdAt || 0).getTime()
        return db - da
      })
  }, [requests])

  const pendingRequestCount = pendingRequests.length
  const dashboardCurrency = familyBank?.currency || personalBank?.currency || 'NOK'

  const totalSpentThisMonth = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return allPaidPayments
      .filter((item) => {
        const dateValue = item.updatedAt || item.transactionDate || item.createdAt
        if (!dateValue) return false

        const d = new Date(dateValue)
        if (Number.isNaN(d.getTime())) return false

        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [allPaidPayments])

  const budgetCompareMax = useMemo(() => {
    return Math.max(monthlyBudget, totalSpentThisMonth, 1)
  }, [monthlyBudget, totalSpentThisMonth])

  const plannedBarWidth = useMemo(() => {
    return (monthlyBudget / budgetCompareMax) * 100
  }, [monthlyBudget, budgetCompareMax])

  const actualBarWidth = useMemo(() => {
    return (totalSpentThisMonth / budgetCompareMax) * 100
  }, [totalSpentThisMonth, budgetCompareMax])

  const budgetUsedPercent = useMemo(() => {
    if (monthlyBudget <= 0) return 0
    return (totalSpentThisMonth / monthlyBudget) * 100
  }, [totalSpentThisMonth, monthlyBudget])

  const budgetRemaining = useMemo(() => {
    return monthlyBudget - totalSpentThisMonth
  }, [monthlyBudget, totalSpentThisMonth])

  const budgetExceeded = budgetRemaining < 0

  const expenseTransactions = useMemo(() => {
    return economyTransactions.filter((item) => item.type === 'expense')
  }, [economyTransactions])

  const totalPendingAmount = useMemo(() => {
    return pendingPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [pendingPayments])

  const totalPaidAmount = useMemo(() => {
    return allPaidPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [allPaidPayments])

  const cashflowByCategory = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        label: string
        pendingAmount: number
        paidAmount: number
        pendingCount: number
        paidCount: number
        totalCount: number
      }
    >()

    expenseTransactions.forEach((item) => {
      const key = String(item.category || 'other').trim().toLowerCase()

      const existing = map.get(key) || {
        key,
        label: getCategoryLabel(key),
        pendingAmount: 0,
        paidAmount: 0,
        pendingCount: 0,
        paidCount: 0,
        totalCount: 0,
      }

      const amountValue = Number(item.amount || 0)

      if (item.status === 'paid') {
        existing.paidAmount += amountValue
        existing.paidCount += 1
      } else {
        existing.pendingAmount += amountValue
        existing.pendingCount += 1
      }

      existing.totalCount += 1
      map.set(key, existing)
    })

    return Array.from(map.values()).sort((a, b) => {
      const totalA = a.pendingAmount + a.paidAmount
      const totalB = b.pendingAmount + b.paidAmount
      return totalB - totalA
    })
  }, [expenseTransactions])

  const shouldScrollCashflowTable = cashflowByCategory.length >= 4

  const categoryPieData = useMemo(() => {
    const baseItems = cashflowByCategory
      .map((item, index) => {
        const total = item.paidAmount + item.pendingAmount
        return {
          ...item,
          total,
          colorClass: PIE_COLOR_CLASSES[index % PIE_COLOR_CLASSES.length],
        }
      })
      .filter((item) => item.total > 0)

    const grandTotal = baseItems.reduce((sum, item) => sum + item.total, 0)

    if (grandTotal <= 0) {
      return {
        items: [],
        grandTotal: 0,
      }
    }

    const minY = 28
    const maxY = 192
    const gap = 24

    const LEFT_TEXT_X = 86
    const RIGHT_TEXT_X = 360
    const LEFT_LINE_END_X = 96
    const RIGHT_LINE_END_X = 350

    let currentAngle = -Math.PI / 2

    const rawItems = baseItems.map((item) => {
      const percent = (item.total / grandTotal) * 100
      const roundedPercent = Math.round(percent)
      const sliceAngle = (item.total / grandTotal) * Math.PI * 2
      const startAngle = currentAngle
      const endAngle = currentAngle + sliceAngle
      const midAngle = startAngle + sliceAngle / 2

      const edgePoint = polarToCartesian(PIE_CX, PIE_CY, PIE_RADIUS, midAngle)
      const outerPoint = polarToCartesian(PIE_CX, PIE_CY, PIE_OUTER_RADIUS, midAngle)

      const isRightSide = Math.cos(midAngle) >= 0
      const side: PieSide = isRightSide ? 'right' : 'left'
      const textAnchor: PieTextAnchor = isRightSide ? 'start' : 'end'
      const textX = isRightSide ? RIGHT_TEXT_X : LEFT_TEXT_X

      currentAngle = endAngle

      return {
        ...item,
        percent,
        percentLabel: `${roundedPercent}%`,
        labelText: `${roundedPercent}% (${item.label})`,
        startAngle,
        endAngle,
        midAngle,
        edgeX: edgePoint.x,
        edgeY: edgePoint.y,
        outerX: outerPoint.x,
        outerY: outerPoint.y,
        textX,
        targetY: outerPoint.y,
        textAnchor,
        side,
      }
    })

    const rightSide = distributeLabelY(
      rawItems.filter((item) => item.side === 'right'),
      minY,
      maxY,
      gap,
    )

    const leftSide = distributeLabelY(
      rawItems.filter((item) => item.side === 'left'),
      minY,
      maxY,
      gap,
    )

    const items = [...leftSide, ...rightSide].map((item) => {
      const bendX =
        item.side === 'right'
          ? PIE_CX + PIE_OUTER_RADIUS + 16
          : PIE_CX - PIE_OUTER_RADIUS - 16

      const lineEndX = item.side === 'right' ? RIGHT_LINE_END_X : LEFT_LINE_END_X

      return {
        ...item,
        linePath: `
          M ${item.edgeX} ${item.edgeY}
          L ${item.outerX} ${item.outerY}
          L ${bendX} ${item.finalY}
          L ${lineEndX} ${item.finalY}
        `,
      }
    })

    return {
      items,
      grandTotal,
    }
  }, [cashflowByCategory])

  const availablePayBanks = useMemo(() => {
    const items: Array<{
      scope: 'family' | 'personal'
      label: string
      balance: number
      currency: string
    }> = []

    if (isConnectedBank(familyBank)) {
      items.push({
        scope: 'family',
        label: `${te.familyBank} • ${familyBank.bankName || te.familyBank}`,
        balance: Number(familyBank.currentBalance || 0),
        currency: familyBank.currency || 'NOK',
      })
    }

    if (isConnectedBank(personalBank)) {
      items.push({
        scope: 'personal',
        label: `${te.personalBank} • ${personalBank.bankName || te.myBank}`,
        balance: Number(personalBank.currentBalance || 0),
        currency: personalBank.currency || 'NOK',
      })
    }

    return items
  }, [familyBank, personalBank, te.familyBank, te.personalBank, te.myBank])

  const selectedPayBank = useMemo(() => {
    return availablePayBanks.find((b) => b.scope === payBankScope) || null
  }, [availablePayBanks, payBankScope])

  const selectedApproveBank = useMemo(() => {
    return availablePayBanks.find((b) => b.scope === approveBankScope) || null
  }, [availablePayBanks, approveBankScope])

  const availableTransferBanks = useMemo(() => {
    const items: Array<{
      scope: 'family' | 'personal'
      label: string
      balance: number
      currency: string
    }> = []

    if (isConnectedBank(familyBank)) {
      items.push({
        scope: 'family',
        label: `${te.familyBank} • ${familyBank.bankName || te.familyBank}`,
        balance: Number(familyBank.currentBalance || 0),
        currency: familyBank.currency || 'NOK',
      })
    }

    if (isConnectedBank(personalBank)) {
      items.push({
        scope: 'personal',
        label: `${te.personalBank} • ${personalBank.bankName || te.myBank}`,
        balance: Number(personalBank.currentBalance || 0),
        currency: personalBank.currency || 'NOK',
      })
    }

    return items
  }, [familyBank, personalBank, te.familyBank, te.personalBank, te.myBank])

  useEffect(() => {
    const bankState = searchParams.get('bank')
    const reason = searchParams.get('reason')

    if (bankState === 'connected') {
      setSuccess(te.bankConnectedSuccess)
    } else if (bankState === 'failed') {
      setError(reason ? `${te.bankConnectionFailed}: ${reason}` : te.bankConnectionFailedTryAgain)
    } else if (bankState === 'select') {
      setSuccess(te.chooseBankAccount)
    }
  }, [searchParams, te])

  useEffect(() => {
    setShowAllPaid(false)
  }, [paidMonthFilter, paidYearFilter])

  useEffect(() => {
    setShowAllTransfers(false)
  }, [transferMonthFilter, transferYearFilter])

  useEffect(() => {
    if (showRequestPanel && pendingRequests.length === 0) {
      setShowRequestPanel(false)
    }
  }, [showRequestPanel, pendingRequests.length])

  useEffect(() => {
    const saved = window.localStorage.getItem('monthlyBudget')
    if (!saved) return

    const parsed = Number(saved)
    if (Number.isFinite(parsed) && parsed >= 0) {
      setMonthlyBudget(parsed)
      setBudgetInput(String(parsed))
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('monthlyBudget', String(monthlyBudget))
  }, [monthlyBudget])

  function scrollList(
    ref: React.MutableRefObject<HTMLDivElement | null>,
    direction: 'up' | 'down',
  ) {
    if (!ref.current) return

    ref.current.scrollBy({
      top: direction === 'up' ? -180 : 180,
      behavior: 'smooth',
    })
  }

  function openTransferForm(fromScope: 'family' | 'personal') {
    const otherScope = fromScope === 'family' ? 'personal' : 'family'
    setTransferFromScope(fromScope)
    setTransferToScope(otherScope)
    setShowTransferModal(true)
    setError('')
    setSuccess('')
  }

  function closeTransferModal() {
    setShowTransferModal(false)
    setAmount('')
    setNote('')
  }

  function openRequestFlow() {
    setError('')
    setSuccess('')

    if (pendingRequests.length > 0) {
      setShowRequestPanel(true)
      setShowRequestModal(false)
      return
    }

    setShowRequestPanel(false)
    setShowRequestModal(true)
  }

  function closeRequestPanel() {
    setShowRequestPanel(false)
  }

  function closeRequestModal() {
    setShowRequestModal(false)
    setRequestTitle('')
    setRequestAmount('')
    setRequestCategory('other')
    setRequestChildId('')
    setRequestNotes('')
  }

  function saveMonthlyBudget(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const parsed = Number(budgetInput)

    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Please enter a valid planned budget.')
      return
    }

    setMonthlyBudget(parsed)
    setShowBudgetModal(false)
    setSuccess('Planned monthly budget saved.')
  }

  function openBankPanel() {
    setError('')
    setSuccess('')
    setShowBankPanel(true)
  }

  function closeBankPanel() {
    setShowBankPanel(false)
  }

  async function loadAll() {
    setLoading(true)
    setError('')

    try {
      const [meRes, statusRes, transfersRes, economyTransactionsRes, childrenRes, requestsRes] =
        await Promise.all([
          fetch('/api/customers/me', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/bank-connections/status', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/bank-transfers?limit=50&sort=-createdAt', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/economy-transactions?limit=200&sort=-transactionDate', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/children?limit=100&sort=createdAt', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/economy-requests?limit=100&sort=-createdAt', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ])

      const meJson = await meRes.json().catch(() => null)
      const statusJson = await statusRes.json().catch(() => null)
      const transfersJson = await transfersRes.json().catch(() => null)
      const economyTransactionsJson = await economyTransactionsRes.json().catch(() => null)
      const childrenJson = await childrenRes.json().catch(() => null)
      const requestsJson = await requestsRes.json().catch(() => null)

      if (!meRes.ok) {
        throw new Error(
          meJson?.message || te.loadCurrentUserFailed.replace('{status}', String(meRes.status)),
        )
      }

      if (!statusRes.ok) {
        throw new Error(
          statusJson?.message || te.loadBankStatusFailed.replace('{status}', String(statusRes.status)),
        )
      }

      if (!transfersRes.ok) {
        throw new Error(
          transfersJson?.message ||
            te.loadTransferHistoryFailed.replace('{status}', String(transfersRes.status)),
        )
      }

      if (!economyTransactionsRes.ok) {
        throw new Error(
          economyTransactionsJson?.message ||
            te.loadEconomyTransactionsFailed.replace(
              '{status}',
              String(economyTransactionsRes.status),
            ),
        )
      }

      if (!childrenRes.ok) {
        throw new Error(
          childrenJson?.message || te.loadChildrenFailed.replace('{status}', String(childrenRes.status)),
        )
      }

      if (!requestsRes.ok) {
        throw new Error(
          requestsJson?.message || te.loadRequestsFailed.replace('{status}', String(requestsRes.status)),
        )
      }

      setMe(meJson?.user ?? meJson ?? null)
      setFamilyBank(statusJson?.familyBank ?? null)
      setPersonalBank(statusJson?.personalBank ?? null)
      setTransfers(transfersJson?.docs ?? [])
      setEconomyTransactions(economyTransactionsJson?.docs ?? [])
      setChildren(childrenJson?.docs ?? [])
      setRequests(requestsJson?.docs ?? [])
    } catch (err: any) {
      setError(err?.message || te.loadEconomyPageError)
      setMe(null)
      setFamilyBank(null)
      setPersonalBank(null)
      setTransfers([])
      setEconomyTransactions([])
      setChildren([])
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function startConnect(connectionScope: 'family' | 'personal') {
    setActionLoading(`connect-${connectionScope}`)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/bank-connections/connect/start', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'enable-banking',
          connectionScope,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || te.couldNotStartBankConnection)
      }

      if (!json?.redirectUrl) {
        throw new Error(te.missingRedirectUrl)
      }

      window.location.href = json.redirectUrl
    } catch (err: any) {
      setError(err?.message || te.couldNotStartBankConnection)
      setActionLoading('')
    }
  }

  async function selectBankAccount(
    connectionScope: 'family' | 'personal',
    externalAccountId: string,
  ) {
    setActionLoading(`select-${connectionScope}-${externalAccountId}`)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/bank-connections/connect/select-account', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionScope,
          externalAccountId,
        }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || te.couldNotSelectBankAccount)
      }

      setSuccess(
        connectionScope === 'family' ? te.familyBankSelectedSuccess : te.personalBankSelectedSuccess,
      )
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotSelectBankAccount)
    } finally {
      setActionLoading('')
    }
  }

  async function disconnectBank(connectionScope: 'family' | 'personal') {
    setActionLoading(`disconnect-${connectionScope}`)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/bank-connections/disconnect', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionScope }),
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.message || te.couldNotDisconnectBank)
      }

      setSuccess(connectionScope === 'family' ? te.familyBankDisconnected : te.personalBankDisconnected)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotDisconnectBank)
    } finally {
      setActionLoading('')
    }
  }

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const parsed = Number(amount)

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return setError(te.enterValidAmount)
    }

    if (transferFromScope === transferToScope) {
      return setError(te.fromToBankMustBeDifferent)
    }

    setActionLoading('transfer')

    try {
      const res = await fetch('/api/bank-transfers/transfer', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parsed,
          note: note.trim(),
          fromScope: transferFromScope,
          toScope: transferToScope,
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
        throw new Error(json?.message || raw || te.couldNotTransferMoney)
      }

      setAmount('')
      setNote('')
      setShowTransferModal(false)
      setSuccess(te.moneyTransferredSuccessfully)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotTransferMoney)
    } finally {
      setActionLoading('')
    }
  }

  async function createPaymentItem(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const parsed = Number(paymentAmount)

    if (!paymentTitle.trim()) {
      return setError(te.enterPaymentTitle)
    }

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return setError(te.enterValidPaymentAmount)
    }

    if (!paymentDueDate) {
      return setError(te.chooseDueDate)
    }

    if (!paymentCategory) {
      return setError(te.chooseCategory)
    }

    if (!me?.id) {
      return setError(te.missingCurrentUser)
    }

    setActionLoading('payment-create')

    try {
      const dueDateIso = new Date(`${paymentDueDate}T12:00:00`).toISOString()

      const res = await fetch('/api/economy-transactions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: paymentTitle.trim(),
          description: paymentDescription.trim() || undefined,
          amount: parsed,
          type: 'expense',
          category: paymentCategory,
          status: 'pending',
          currency: familyBank?.currency || personalBank?.currency || 'NOK',
          transactionDate: dueDateIso,
          paidBy: me.id,
          child: paymentChildId || undefined,
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
        throw new Error(json?.message || json?.errors?.[0]?.message || raw || te.couldNotCreatePaymentItem)
      }

      setPaymentTitle('')
      setPaymentAmount('')
      setPaymentDueDate(toDateInputValue())
      setPaymentDescription('')
      setPaymentCategory('bills')
      setPaymentChildId('')
      setSuccess(te.paymentItemCreated)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotCreatePaymentItem)
    } finally {
      setActionLoading('')
    }
  }

  async function deletePaymentItem(id: string | number) {
    setError('')
    setSuccess('')
    setActionLoading(`payment-delete-${id}`)

    try {
      const res = await fetch(`/api/economy-transactions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.message || te.couldNotDeletePaymentItem)
      }

      setSuccess(te.paymentItemDeleted)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotDeletePaymentItem)
    } finally {
      setActionLoading('')
    }
  }

  function openPayFlow(item: EconomyTransactionDoc) {
    const defaultScope =
      getBankStatus(familyBank) === 'connected'
        ? 'family'
        : getBankStatus(personalBank) === 'connected'
          ? 'personal'
          : 'family'

    setPayTarget(item)
    setPayStep('confirm')
    setPayBankScope(defaultScope)
    setPayError('')
  }

  function closePayFlow() {
    setPayTarget(null)
    setPayStep('confirm')
    setPayBankScope('family')
    setPayError('')
  }

  async function createRequest(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const parsed = Number(requestAmount)

    if (!requestTitle.trim()) {
      return setError(te.enterRequestTitle)
    }

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return setError(te.enterValidRequestAmount)
    }

    if (!requestCategory) {
      return setError(te.chooseCategory)
    }

    setActionLoading('request-create')

    try {
      const res = await fetch('/api/economy-requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: requestTitle.trim(),
          amount: parsed,
          category: requestCategory,
          child: requestChildId || undefined,
          notes: requestNotes.trim() || undefined,
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
        throw new Error(json?.message || raw || te.couldNotCreateRequest)
      }

      closeRequestModal()
      setSuccess(te.requestCreatedSuccessfully)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotCreateRequest)
    } finally {
      setActionLoading('')
    }
  }

  function openApproveFlow(item: EconomyRequestDoc) {
    const defaultScope =
      getBankStatus(familyBank) === 'connected'
        ? 'family'
        : getBankStatus(personalBank) === 'connected'
          ? 'personal'
          : 'family'

    setApproveTarget(item)
    setApproveBankScope(defaultScope)
    setApproveError('')
    setError('')
    setSuccess('')
  }

  function closeApproveFlow() {
    setApproveTarget(null)
    setApproveBankScope('family')
    setApproveError('')
  }

  async function approveRequest() {
    if (!approveTarget) return

    setError('')
    setSuccess('')
    setApproveError('')
    setActionLoading(`request-approve-${approveTarget.id}`)

    try {
      const selectedBank = availablePayBanks.find((b) => b.scope === approveBankScope)
      const amountToApprove = Number(approveTarget.amount || 0)

      if (!selectedBank) {
        throw new Error(te.selectedBankNotAvailable)
      }

      if (selectedBank.balance < amountToApprove) {
        setApproveError(te.bankNotEnoughBalanceForRequest)
        setActionLoading('')
        return
      }

      const res = await fetch('/api/economy-requests/approve', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: approveTarget.id,
          connectionScope: approveBankScope,
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
        throw new Error(json?.message || raw || te.couldNotApproveRequest)
      }

      closeApproveFlow()
      setSuccess(te.requestApprovedSuccessfully)
      await loadAll()
    } catch (err: any) {
      setApproveError(err?.message || te.couldNotApproveRequest)
    } finally {
      setActionLoading('')
    }
  }

  async function rejectRequest(id: string | number) {
    const decisionNote = window.prompt(te.rejectionReasonPrompt, '') || ''

    setError('')
    setSuccess('')
    setActionLoading(`request-reject-${id}`)

    try {
      const res = await fetch('/api/economy-requests/reject', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          decisionNote,
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
        throw new Error(json?.message || raw || te.couldNotRejectRequest)
      }

      setSuccess(te.requestRejected)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || te.couldNotRejectRequest)
    } finally {
      setActionLoading('')
    }
  }

  async function payPaymentItem() {
    if (!payTarget) return

    setError('')
    setSuccess('')
    setPayError('')
    setActionLoading(`payment-pay-${payTarget.id}`)

    try {
      const selectedBank = availablePayBanks.find((b) => b.scope === payBankScope)
      const amountToPay = Number(payTarget.amount || 0)

      if (!selectedBank) {
        throw new Error(te.selectedBankNotAvailable)
      }

      if (selectedBank.balance < amountToPay) {
        setPayError(te.bankNotEnoughBalanceForPayment)
        setActionLoading('')
        return
      }

      const res = await fetch('/api/economy-transactions/pay', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: payTarget.id,
          connectionScope: payBankScope,
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
        const message = json?.message || json?.errors?.[0]?.message || raw || te.couldNotPayPaymentItem
        setPayError(message)
        throw new Error(message)
      }

      closePayFlow()
      setSuccess(te.paymentCompletedSuccessfully)
      await loadAll()
    } catch (err: any) {
      setPayError(err?.message || te.couldNotPayThisItem)
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <div className={styles.loading}>{te.loading}</div>
  }

  const familyChoices = getSelectableAccounts(familyBank)
  const personalChoices = getSelectableAccounts(personalBank)

  return (
    <div className={styles.wrapper}>
      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}

      <section className={styles.heroBoard}>
        <div className={styles.heroMain}>
          <div className={styles.heroIntro}>
            <div>
              <div className={styles.heroKicker}>{te.heroKicker}</div>
              <h1 className={styles.heroHeading}>{te.title}</h1>
              <p className={styles.heroDescription}>{te.heroDescription}</p>
            </div>

            <div className={styles.heroDateCard}>
              <div className={styles.heroDateMonth}>{dashboardMonth}</div>
              <div className={styles.heroDateMeta}>
                <span>{dashboardYear}</span>
                <span>
                  {te.todayLabelPrefix} {todayLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className={styles.heroAside}>
          <div className={styles.heroActionCard}>
            <div className={styles.heroActionTitle}>{te.quickActionsTitle}</div>
            <p className={styles.heroActionText}>{te.quickActionsText}</p>

            <div className={styles.heroActionButtons}>
              <button
                type="button"
                className={styles.iconBankBtnLarge}
                onClick={openBankPanel}
                disabled={actionLoading !== ''}
                aria-label={te.openBankPanel}
                title={te.openBankPanel}
              >
                <svg
                  className={styles.bankIconSvg}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M16 15h2" />
                  <path d="M12 15h2" />
                </svg>
              </button>

              <button
                type="button"
                className={styles.heroRequestBtn}
                onClick={openRequestFlow}
                disabled={actionLoading !== ''}
              >
                <span>{te.request}</span>
                {pendingRequestCount > 0 ? (
                  <span className={styles.heroRequestBadge}>{pendingRequestCount}</span>
                ) : null}
              </button>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.budgetOverviewCard}>
        <div className={styles.budgetOverviewHeader}>
          <div>
            <div className={styles.cashflowEyebrow}>Monthly budget overview</div>
            <div className={styles.cashflowTitle}>This month spending</div>
            <div className={styles.cashflowSub}>
              Compare your planned spending with your real paid expenses this month.
            </div>
          </div>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setBudgetInput(monthlyBudget > 0 ? String(monthlyBudget) : '')
              setShowBudgetModal(true)
            }}
          >
            {monthlyBudget > 0 ? 'Edit planned spending' : 'Set up planned spending'}
          </button>
        </div>

        <div className={styles.budgetOverviewStats}>
          <div className={styles.budgetMiniCard}>
            <span>Actual this month</span>
            <strong>{fmtCurrency(totalSpentThisMonth, dashboardCurrency)}</strong>
          </div>

          <div className={styles.budgetMiniCard}>
            <span>Planned budget</span>
            <strong>{fmtCurrency(monthlyBudget, dashboardCurrency)}</strong>
          </div>

          <div className={styles.budgetMiniCard}>
            <span>{budgetExceeded ? 'Over budget' : 'Remaining'}</span>
            <strong>{fmtCurrency(Math.abs(budgetRemaining), dashboardCurrency)}</strong>
          </div>
        </div>

        <div className={styles.budgetCompare}>
          <div className={styles.budgetCompareTop}>
            <span>Budget progress</span>
            <strong>{monthlyBudget > 0 ? `${Math.round(budgetUsedPercent)}% used` : 'No plan set'}</strong>
          </div>

          <div className={styles.budgetBarsGroup}>
            <div className={styles.budgetBarBlock}>
              <div className={styles.budgetBarLabelRow}>
                <span>Planned</span>
                <strong>{fmtCurrency(monthlyBudget, dashboardCurrency)}</strong>
              </div>

              <div className={styles.budgetBarTrack}>
                <div className={styles.budgetBarPlanned} style={{ width: `${plannedBarWidth}%` }} />
              </div>
            </div>

            <div className={styles.budgetBarBlock}>
              <div className={styles.budgetBarLabelRow}>
                <span>Actual</span>
                <strong>{fmtCurrency(totalSpentThisMonth, dashboardCurrency)}</strong>
              </div>

              <div className={styles.budgetBarTrack}>
                <div className={styles.budgetBarActual} style={{ width: `${actualBarWidth}%` }} />
              </div>
            </div>
          </div>

          <div className={styles.budgetCompareMeta}>
            <span>Difference: {fmtCurrency(monthlyBudget - totalSpentThisMonth, dashboardCurrency)}</span>
            <span>
              {totalSpentThisMonth > monthlyBudget
                ? 'You are above plan this month.'
                : 'You are within plan.'}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.cashflowGrid}>
        <section className={styles.cashflowCard}>
          <div className={styles.cashflowHeader}>
            <div>
              <div className={styles.cashflowEyebrow}>{te.cashflowSummaryEyebrow}</div>
              <div className={styles.cashflowTitle}>{te.thingsToPayByCategory}</div>
              <div className={styles.cashflowSub}>{te.thingsToPayByCategoryDescription}</div>
            </div>

            <div className={styles.cashflowStats}>
              <div className={styles.cashflowStat}>
                <span>{te.upcoming}</span>
                <strong>{fmtCurrency(totalPendingAmount, dashboardCurrency)}</strong>
              </div>
              <div className={styles.cashflowStat}>
                <span>{te.paid}</span>
                <strong>{fmtCurrency(totalPaidAmount, dashboardCurrency)}</strong>
              </div>
            </div>
          </div>

          {cashflowByCategory.length === 0 ? (
            <div className={styles.emptyBox}>{te.noPaymentCategoriesYet}</div>
          ) : (
            <div
              className={`${styles.tableWrap} ${
                shouldScrollCashflowTable ? styles.cashflowScrollArea : ''
              }`}
            >
              <table className={styles.cashflowTable}>
                <thead>
                  <tr>
                    <th>{te.category}</th>
                    <th>{te.upcoming}</th>
                    <th>{te.paid}</th>
                    <th>{te.items}</th>
                  </tr>
                </thead>
                <tbody>
                  {cashflowByCategory.map((item) => (
                    <tr key={item.key}>
                      <td>{item.label}</td>
                      <td>{fmtCurrency(item.pendingAmount, dashboardCurrency)}</td>
                      <td>{fmtCurrency(item.paidAmount, dashboardCurrency)}</td>
                      <td>{item.totalCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.cashflowCard}>
          <div className={styles.cashflowHeader}>
            <div>
              <div className={styles.cashflowEyebrow}>{te.visualBreakdownEyebrow}</div>
              <div className={styles.cashflowTitle}>{te.categoryUsage}</div>
              <div className={styles.cashflowSub}>{te.categoryUsageDescription}</div>
            </div>
          </div>

          {categoryPieData.items.length === 0 ? (
            <div className={styles.emptyBox}>{te.noDataToVisualizeYet}</div>
          ) : (
            <div className={styles.pieLayout}>
              <div className={styles.pieChartBox}>
                <svg
                  className={styles.pieSvg}
                  viewBox="0 0 430 220"
                  role="img"
                  aria-label="Category usage pie chart"
                >
                  {categoryPieData.items.map((item) => (
                    <path
                      key={item.key}
                      d={describePieSlice(PIE_CX, PIE_CY, PIE_RADIUS, item.startAngle, item.endAngle)}
                      className={`${styles.pieSlice} ${styles[item.colorClass]}`}
                    />
                  ))}

                  {categoryPieData.items.map((item) => (
                    <path
                      key={`${item.key}-line`}
                      d={item.linePath}
                      className={styles.pieLeaderLine}
                    />
                  ))}

                  {categoryPieData.items.map((item) => (
                    <text
                      key={`${item.key}-label`}
                      x={item.textX}
                      y={item.finalY}
                      textAnchor={item.textAnchor}
                      className={styles.pieOuterLabel}
                    >
                      {item.labelText}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{te.thingsToPay}</div>
            <div className={styles.cardSub}>{te.thingsToPayDescription}</div>
          </div>
        </div>

        <form className={styles.paymentForm} onSubmit={createPaymentItem}>
          <div className={styles.transferRow}>
            <label className={styles.label}>
              {te.titleField}
              <input
                className={styles.input}
                type="text"
                placeholder={te.paymentTitlePlaceholder}
                value={paymentTitle}
                onChange={(e) => setPaymentTitle(e.target.value)}
                maxLength={120}
              />
            </label>

            <label className={styles.label}>
              {te.amountField}
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                placeholder={te.enterAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.transferRow}>
            <label className={styles.label}>
              {te.dueDate}
              <input
                className={styles.input}
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              {te.category}
              <select
                className={styles.select}
                value={paymentCategory}
                onChange={(e) => setPaymentCategory(e.target.value)}
              >
                <option value="food">{te.categoryFood}</option>
                <option value="transport">{te.categoryTransport}</option>
                <option value="health">{te.categoryHealth}</option>
                <option value="school">{te.categorySchool}</option>
                <option value="activities">{te.categoryActivities}</option>
                <option value="clothes">{te.categoryClothes}</option>
                <option value="bills">{te.categoryBills}</option>
                <option value="other">{te.categoryOther}</option>
              </select>
            </label>
          </div>

          <div className={styles.transferRow}>
            <label className={styles.label}>
              {te.linkToChild}
              <select
                className={styles.select}
                value={paymentChildId}
                onChange={(e) => setPaymentChildId(e.target.value)}
              >
                <option value="">{te.noChildLinked}</option>
                {children.map((child) => (
                  <option key={String(child.id)} value={String(child.id)}>
                    {child.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              {te.descriptionOptional}
              <input
                className={styles.input}
                type="text"
                placeholder={te.optionalShortNote}
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                maxLength={200}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={actionLoading !== ''}>
              {actionLoading === 'payment-create' ? te.creating : te.addPaymentItem}
            </button>
          </div>
        </form>

        {pendingPayments.length === 0 ? (
          <div className={styles.emptyBox}>{te.noUpcomingPaymentsYet}</div>
        ) : (
          <div className={styles.list}>
            {pendingPayments.map((item) => (
              <div key={String(item.id)} className={styles.paymentRow}>
                <div>
                  <div className={styles.rowTitle}>{item.title}</div>
                  <div className={styles.rowMeta}>
                    {te.due}: {fmtDateOnly(item.transactionDate)}
                    {item.category ? ` • ${getCategoryLabel(item.category)}` : ''}
                    {(() => {
                      const childId = getRelationId(item.child)
                      const childName = childId ? childNameById.get(childId) : ''
                      return childName ? ` • ${te.child}: ${childName}` : ''
                    })()}
                    {item.description ? ` • ${item.description}` : ''}
                  </div>
                </div>

                <div className={styles.paymentActions}>
                  <div className={styles.amountNegative}>
                    {fmtCurrency(item.amount, item.currency || 'NOK')}
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => openPayFlow(item)}
                    disabled={actionLoading !== ''}
                  >
                    {te.pay}
                  </button>

                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => deletePaymentItem(item.id)}
                    disabled={actionLoading !== ''}
                  >
                    {actionLoading === `payment-delete-${item.id}` ? te.deleting : te.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{te.recentPaid}</div>
            <div className={styles.cardSub}>{te.recentPaidDescription}</div>
          </div>

          <div className={styles.filterBar}>
            <label className={styles.filterField}>
              {te.month}
              <select
                className={styles.select}
                value={paidMonthFilter}
                onChange={(e) => setPaidMonthFilter(e.target.value)}
              >
                <option value="all">{te.all}</option>
                {paidMonthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              {te.year}
              <select
                className={styles.select}
                value={paidYearFilter}
                onChange={(e) => setPaidYearFilter(e.target.value)}
              >
                <option value="all">{te.all}</option>
                {paidYearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredPaidPayments.length === 0 ? (
          <div className={styles.emptyBox}>{te.noPaidItemsFoundForFilter}</div>
        ) : (
          <>
            <div className={styles.feedFrame}>
              <div
                ref={paidListRef}
                className={`${styles.feedList} ${showAllPaid ? styles.feedListExpanded : ''}`}
              >
                {visiblePaidPayments.map((item) => (
                  <div key={String(item.id)} className={styles.listRow}>
                    <div>
                      <div className={styles.rowTitle}>
                        {item.title}
                        {item.sourceType === 'request' ? (
                          <span className={styles.requestBadge}>{te.request}</span>
                        ) : null}
                      </div>
                      <div className={styles.rowMeta}>
                        {te.paid}: {fmtDateTime(item.updatedAt || item.transactionDate)}
                        {item.category ? ` • ${getCategoryLabel(item.category)}` : ''}
                        {(() => {
                          const childId = getRelationId(item.child)
                          const childName = childId ? childNameById.get(childId) : ''
                          return childName ? ` • ${te.child}: ${childName}` : ''
                        })()}
                        {item.sourceType === 'request' ? ` • ${te.fromRequest}` : ''}
                        {item.requestCreatedByName
                          ? ` • ${te.requestedBy}: ${item.requestCreatedByName}`
                          : ''}
                        {item.approvedByName ? ` • ${te.approvedBy}: ${item.approvedByName}` : ''}
                        {item.paidFromScope
                          ? ` • ${te.paidFrom}: ${
                              item.paidFromScope === 'family' ? te.familyBank : te.personalBank
                            }`
                          : ''}
                        {item.description ? ` • ${item.description}` : ''}
                      </div>
                    </div>

                    <div className={styles.amountPositive}>
                      {fmtCurrency(item.amount, item.currency || 'NOK')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.feedFooter}>
              {filteredPaidPayments.length > 3 ? (
                <button
                  type="button"
                  className={styles.viewMoreBtn}
                  onClick={() => setShowAllPaid((prev) => !prev)}
                >
                  {showAllPaid ? te.seeLess : te.seeMore}
                </button>
              ) : (
                <span />
              )}

              {showAllPaid && filteredPaidPayments.length > 3 ? (
                <div className={styles.scrollControls}>
                  <button
                    type="button"
                    className={styles.scrollBtn}
                    onClick={() => scrollList(paidListRef, 'up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.scrollBtn}
                    onClick={() => scrollList(paidListRef, 'down')}
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>{te.recentTransfers}</div>
            <div className={styles.cardSub}>{te.recentTransfersDescription}</div>
          </div>

          <div className={styles.filterBar}>
            <label className={styles.filterField}>
              {te.month}
              <select
                className={styles.select}
                value={transferMonthFilter}
                onChange={(e) => setTransferMonthFilter(e.target.value)}
              >
                <option value="all">{te.all}</option>
                {transferMonthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              {te.year}
              <select
                className={styles.select}
                value={transferYearFilter}
                onChange={(e) => setTransferYearFilter(e.target.value)}
              >
                <option value="all">{te.all}</option>
                {transferYearOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredTransfers.length === 0 ? (
          <div className={styles.emptyBox}>{te.noTransfersFoundForFilter}</div>
        ) : (
          <>
            <div className={styles.feedFrame}>
              <div
                ref={transferListRef}
                className={`${styles.feedList} ${showAllTransfers ? styles.feedListExpanded : ''}`}
              >
                {visibleTransfers.map((item) => (
                  <div key={String(item.id)} className={styles.listRow}>
                    <div>
                      <div className={styles.rowTitle}>{item.note || te.transferBetweenAccounts}</div>
                      <div className={styles.rowMeta}>
                        {item.initiatedByName || te.unknownUser} • {fmtDateTime(item.createdAt)}
                      </div>
                    </div>

                    <div className={styles.amountPositive}>
                      + {fmtCurrency(item.amount, item.currency || 'NOK')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.feedFooter}>
              {filteredTransfers.length > 3 ? (
                <button
                  type="button"
                  className={styles.viewMoreBtn}
                  onClick={() => setShowAllTransfers((prev) => !prev)}
                >
                  {showAllTransfers ? te.seeLess : te.seeMore}
                </button>
              ) : (
                <span />
              )}

              {showAllTransfers && filteredTransfers.length > 3 ? (
                <div className={styles.scrollControls}>
                  <button
                    type="button"
                    className={styles.scrollBtn}
                    onClick={() => scrollList(transferListRef, 'up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.scrollBtn}
                    onClick={() => scrollList(transferListRef, 'down')}
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      {showBudgetModal ? (
        <div className={styles.modalBackdrop} onMouseDown={() => setShowBudgetModal(false)}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Set planned monthly spending</div>
            <p className={styles.modalText}>Choose how much you plan to spend this month.</p>

            <form className={styles.transferForm} onSubmit={saveMonthlyBudget}>
              <label className={styles.label}>
                Planned amount
                <input
                  className={styles.input}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Enter monthly budget"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                />
              </label>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowBudgetModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className={styles.primaryBtn}>
                  Save budget
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showBankPanel ? (
        <div className={styles.modalBackdrop} onMouseDown={closeBankPanel}>
          <div
            className={`${styles.modalCard} ${styles.bankModalCard}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalTitle}>{te.bankConnections}</div>
            <p className={styles.modalText}>{te.bankConnectionsDescription}</p>

            <div className={styles.bankGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>{te.familyBank}</div>
                    <div className={styles.cardSub}>{te.familyBankDescription}</div>
                  </div>

                  <span
                    className={`${styles.statusBadge} ${
                      familyStatus === 'connected'
                        ? styles.statusConnected
                        : familyStatus === 'pending'
                          ? styles.statusPending
                          : styles.statusMuted
                    }`}
                  >
                    {getBankStatusLabel(familyStatus)}
                  </span>
                </div>

                {familyBank ? (
                  <div className={styles.bankMeta}>
                    <div className={styles.bankName}>{familyBank.bankName || te.familyBank}</div>
                    <div className={styles.bankInfo}>
                      {familyBank.accountName || te.sharedAccount}
                      {familyBank.maskedAccount ? ` • ${familyBank.maskedAccount}` : ''}
                    </div>
                    <div className={styles.balance}>
                      {fmtCurrency(familyBank.currentBalance, familyBank.currency || 'NOK')}
                    </div>
                    <div className={styles.muted}>
                      {te.lastSynced}: {fmtDateTime(familyBank.lastSyncedAt)}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyBox}>{te.noFamilyBankConnectedYet}</div>
                )}

                {needsAccountSelection(familyBank) && familyChoices.length > 0 ? (
                  <div className={styles.selectionWrap}>
                    <div className={styles.selectionTitle}>{te.chooseAccountForFamilyBank}</div>
                    <div className={styles.selectionList}>
                      {familyChoices.map((item) => (
                        <div key={item.externalAccountId} className={styles.selectionItem}>
                          <div>
                            <div className={styles.selectionName}>{item.accountName}</div>
                            <div className={styles.selectionMeta}>
                              {item.bankName} • {item.maskedAccount} • {item.currency}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => selectBankAccount('family', item.externalAccountId)}
                            disabled={actionLoading !== ''}
                          >
                            {actionLoading === `select-family-${item.externalAccountId}`
                              ? te.saving
                              : te.useThisAccount}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    {familyStatus === 'not_connected' ||
                    familyStatus === 'failed' ||
                    familyStatus === 'expired' ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => startConnect('family')}
                        disabled={actionLoading !== ''}
                      >
                        {actionLoading === 'connect-family' ? te.connecting : te.connectFamilyBank}
                      </button>
                    ) : familyStatus === 'pending' ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => startConnect('family')}
                        disabled={actionLoading !== ''}
                      >
                        {actionLoading === 'connect-family' ? te.opening : te.continueConnect}
                      </button>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => openTransferForm('family')}
                          disabled={actionLoading !== ''}
                        >
                          {te.transfer}
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => disconnectBank('family')}
                          disabled={actionLoading !== ''}
                        >
                          {actionLoading === 'disconnect-family' ? te.disconnecting : te.disconnect}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>{te.personalBank}</div>
                    <div className={styles.cardSub}>
                      {te.personalBankDescription.replace('{name}', fullName)}
                    </div>
                  </div>

                  <span
                    className={`${styles.statusBadge} ${
                      personalStatus === 'connected'
                        ? styles.statusConnected
                        : personalStatus === 'pending'
                          ? styles.statusPending
                          : styles.statusMuted
                    }`}
                  >
                    {getBankStatusLabel(personalStatus)}
                  </span>
                </div>

                {personalBank ? (
                  <div className={styles.bankMeta}>
                    <div className={styles.bankName}>
                      {personalBank.bankName || `${fullName} ${te.bank}`}
                    </div>
                    <div className={styles.bankInfo}>
                      {personalBank.accountName || te.personalAccount}
                      {personalBank.maskedAccount ? ` • ${personalBank.maskedAccount}` : ''}
                    </div>
                    <div className={styles.balance}>
                      {fmtCurrency(personalBank.currentBalance, personalBank.currency || 'NOK')}
                    </div>
                    <div className={styles.muted}>
                      {te.lastSynced}: {fmtDateTime(personalBank.lastSyncedAt)}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyBox}>{te.noPersonalBankConnectedYet}</div>
                )}

                {needsAccountSelection(personalBank) && personalChoices.length > 0 ? (
                  <div className={styles.selectionWrap}>
                    <div className={styles.selectionTitle}>{te.chooseAccountForPersonalBank}</div>
                    <div className={styles.selectionList}>
                      {personalChoices.map((item) => (
                        <div key={item.externalAccountId} className={styles.selectionItem}>
                          <div>
                            <div className={styles.selectionName}>{item.accountName}</div>
                            <div className={styles.selectionMeta}>
                              {item.bankName} • {item.maskedAccount} • {item.currency}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => selectBankAccount('personal', item.externalAccountId)}
                            disabled={actionLoading !== ''}
                          >
                            {actionLoading === `select-personal-${item.externalAccountId}`
                              ? te.saving
                              : te.useThisAccount}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    {personalStatus === 'not_connected' ||
                    personalStatus === 'failed' ||
                    personalStatus === 'expired' ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => startConnect('personal')}
                        disabled={actionLoading !== ''}
                      >
                        {actionLoading === 'connect-personal' ? te.connecting : te.connectMyBank}
                      </button>
                    ) : personalStatus === 'pending' ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => startConnect('personal')}
                        disabled={actionLoading !== ''}
                      >
                        {actionLoading === 'connect-personal' ? te.opening : te.continueConnect}
                      </button>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => openTransferForm('personal')}
                          disabled={actionLoading !== ''}
                        >
                          {te.transfer}
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => disconnectBank('personal')}
                          disabled={actionLoading !== ''}
                        >
                          {actionLoading === 'disconnect-personal'
                            ? te.disconnecting
                            : te.disconnect}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={closeBankPanel}>
                {te.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRequestPanel ? (
        <div className={styles.modalBackdrop} onMouseDown={closeRequestPanel}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{te.pendingRequests}</div>
            <p className={styles.modalText}>{te.pendingRequestsDescription}</p>

            <div className={styles.list}>
              {pendingRequests.map((item) => {
                const childId = getRelationId(item.child)
                const childName = childId ? childNameById.get(childId) : ''
                const isOwn = String(getRelationId(item.createdBy)) === String(me?.id ?? '')

                return (
                  <div key={String(item.id)} className={styles.paymentRow}>
                    <div>
                      <div className={styles.rowTitle}>{item.title}</div>
                      <div className={styles.rowMeta}>
                        {te.requestedBy}: {item.createdByName || te.unknown}
                        {item.category ? ` • ${getCategoryLabel(item.category)}` : ''}
                        {childName ? ` • ${te.child}: ${childName}` : ''}
                        {item.createdAt ? ` • ${fmtDateTime(item.createdAt)}` : ''}
                        {item.notes ? ` • ${item.notes}` : ''}
                      </div>
                    </div>

                    <div className={styles.paymentActions}>
                      <div className={styles.amountNegative}>{fmtCurrency(item.amount)}</div>

                      {!isOwn ? (
                        <>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => {
                              setShowRequestPanel(false)
                              openApproveFlow(item)
                            }}
                            disabled={actionLoading !== ''}
                          >
                            {actionLoading === `request-approve-${item.id}` ? te.approving : te.approve}
                          </button>

                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => rejectRequest(item.id)}
                            disabled={actionLoading !== ''}
                          >
                            {actionLoading === `request-reject-${item.id}` ? te.rejecting : te.reject}
                          </button>
                        </>
                      ) : (
                        <div className={styles.muted}>{te.waitingForReview}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={closeRequestPanel}>
                {te.close}
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  setShowRequestPanel(false)
                  setShowRequestModal(true)
                }}
                disabled={actionLoading !== ''}
              >
                {te.newRequest}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRequestModal ? (
        <div className={styles.modalBackdrop} onMouseDown={closeRequestModal}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{te.createRequest}</div>
            <p className={styles.modalText}>{te.createRequestDescription}</p>

            <form className={styles.transferForm} onSubmit={createRequest}>
              <div className={styles.transferRow}>
                <label className={styles.label}>
                  {te.titleField}
                  <input
                    className={styles.input}
                    type="text"
                    placeholder={te.requestTitlePlaceholder}
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    maxLength={120}
                  />
                </label>

                <label className={styles.label}>
                  {te.amountField}
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    placeholder={te.enterAmount}
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.transferRow}>
                <label className={styles.label}>
                  {te.category}
                  <select
                    className={styles.select}
                    value={requestCategory}
                    onChange={(e) => setRequestCategory(e.target.value)}
                  >
                    <option value="food">{te.categoryFood}</option>
                    <option value="housing">{te.categoryHousing}</option>
                    <option value="transport">{te.categoryTransport}</option>
                    <option value="health">{te.categoryHealth}</option>
                    <option value="school">{te.categorySchool}</option>
                    <option value="activities">{te.categoryActivities}</option>
                    <option value="clothes">{te.categoryClothes}</option>
                    <option value="bills">{te.categoryBills}</option>
                    <option value="other">{te.categoryOther}</option>
                  </select>
                </label>

                <label className={styles.label}>
                  {te.linkToChild}
                  <select
                    className={styles.select}
                    value={requestChildId}
                    onChange={(e) => setRequestChildId(e.target.value)}
                  >
                    <option value="">{te.noChildLinked}</option>
                    {children.map((child) => (
                      <option key={String(child.id)} value={String(child.id)}>
                        {child.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.label}>
                {te.noteReason}
                <input
                  className={styles.input}
                  type="text"
                  placeholder={te.requestReasonPlaceholder}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  maxLength={300}
                />
              </label>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={closeRequestModal}>
                  {te.cancel}
                </button>

                <button type="submit" className={styles.primaryBtn} disabled={actionLoading !== ''}>
                  {actionLoading === 'request-create' ? te.creating : te.submitRequest}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showTransferModal ? (
        <div className={styles.modalBackdrop} onMouseDown={closeTransferModal}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{te.transferBetweenAccounts}</div>
            <p className={styles.modalText}>{te.transferBetweenAccountsDescription}</p>

            {availableTransferBanks.length < 2 ? (
              <div className={styles.emptyBox}>{te.connectBothBanksFirst}</div>
            ) : (
              <form className={styles.transferForm} onSubmit={submitTransfer}>
                <div className={styles.transferRow}>
                  <label className={styles.label}>
                    {te.from}
                    <select
                      className={styles.select}
                      value={transferFromScope}
                      onChange={(e) => {
                        const next = e.target.value as 'family' | 'personal'
                        const previousFrom = transferFromScope
                        setTransferFromScope(next)

                        if (next === transferToScope) {
                          setTransferToScope(previousFrom)
                        }
                      }}
                    >
                      {availableTransferBanks.map((bank) => (
                        <option key={bank.scope} value={bank.scope}>
                          {bank.label} • {fmtCurrency(bank.balance, bank.currency)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.label}>
                    {te.to}
                    <select
                      className={styles.select}
                      value={transferToScope}
                      onChange={(e) => {
                        const next = e.target.value as 'family' | 'personal'
                        const previousTo = transferToScope
                        setTransferToScope(next)

                        if (next === transferFromScope) {
                          setTransferFromScope(previousTo)
                        }
                      }}
                    >
                      {availableTransferBanks.map((bank) => (
                        <option key={bank.scope} value={bank.scope}>
                          {bank.label} • {fmtCurrency(bank.balance, bank.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.transferRow}>
                  <label className={styles.label}>
                    {te.amountField}
                    <input
                      className={styles.input}
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.01"
                      placeholder={te.enterAmount}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>

                  <label className={styles.label}>
                    {te.note}
                    <input
                      className={styles.input}
                      type="text"
                      placeholder={te.transferNotePlaceholder}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={160}
                    />
                  </label>
                </div>

                <div className={styles.quickRow}>
                  {[200, 500, 1000, 1500].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={styles.quickBtn}
                      onClick={() => setAmount(String(v))}
                    >
                      {fmtCurrency(v, personalBank?.currency || familyBank?.currency || 'NOK')}
                    </button>
                  ))}
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={closeTransferModal}>
                    {te.cancel}
                  </button>

                  <button type="submit" className={styles.primaryBtn} disabled={actionLoading !== ''}>
                    {actionLoading === 'transfer' ? te.transferring : te.transferMoney}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {payTarget ? (
        <div className={styles.modalBackdrop} onMouseDown={closePayFlow}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            {payStep === 'confirm' ? (
              <>
                <div className={styles.modalTitle}>{te.payThisItem}</div>
                <p className={styles.modalText}>
                  {te.payThisItemDescriptionBefore} <strong>{payTarget.title}</strong>{' '}
                  {te.payThisItemDescriptionMiddle}{' '}
                  <strong>{fmtCurrency(payTarget.amount, payTarget.currency || 'NOK')}</strong>.
                </p>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={closePayFlow}>
                    {te.cancel}
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => setPayStep('select')}
                  >
                    {te.yesContinue}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.modalTitle}>{te.chooseBankToPayFrom}</div>

                {availablePayBanks.length === 0 ? (
                  <div className={styles.emptyBox}>{te.noConnectedBankForPayment}</div>
                ) : (
                  <label className={styles.label}>
                    {te.bank}
                    <select
                      className={styles.select}
                      value={payBankScope}
                      onChange={(e) => {
                        setPayBankScope(e.target.value as 'family' | 'personal')
                        setPayError('')
                      }}
                    >
                      {availablePayBanks.map((bank) => (
                        <option key={bank.scope} value={bank.scope}>
                          {bank.label} • {fmtCurrency(bank.balance, bank.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {selectedPayBank ? (
                  <div className={styles.muted}>
                    {te.availableBalance}: {fmtCurrency(selectedPayBank.balance, selectedPayBank.currency)}
                  </div>
                ) : null}

                {selectedPayBank &&
                payTarget &&
                selectedPayBank.balance < Number(payTarget.amount || 0) ? (
                  <div className={styles.error}>{te.bankNotEnoughBalanceForPayment}</div>
                ) : null}

                {payError ? <div className={styles.error}>{payError}</div> : null}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setPayStep('confirm')}
                  >
                    {te.back}
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={payPaymentItem}
                    disabled={
                      availablePayBanks.length === 0 ||
                      actionLoading === `payment-pay-${payTarget.id}` ||
                      (selectedPayBank
                        ? selectedPayBank.balance < Number(payTarget.amount || 0)
                        : true)
                    }
                  >
                    {actionLoading === `payment-pay-${payTarget.id}` ? te.paying : te.payNow}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {approveTarget ? (
        <div className={styles.modalBackdrop} onMouseDown={closeApproveFlow}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{te.approveRequest}</div>

            <p className={styles.modalText}>
              {te.approveRequestDescriptionBefore} <strong>{approveTarget.title}</strong>{' '}
              {te.approveRequestDescriptionMiddle}{' '}
              <strong>
                {fmtCurrency(
                  approveTarget.amount,
                  familyBank?.currency || personalBank?.currency || 'NOK',
                )}
              </strong>
              .
            </p>

            {availablePayBanks.length === 0 ? (
              <div className={styles.emptyBox}>{te.noConnectedBankForApproval}</div>
            ) : (
              <label className={styles.label}>
                {te.chooseBank}
                <select
                  className={styles.select}
                  value={approveBankScope}
                  onChange={(e) => {
                    setApproveBankScope(e.target.value as 'family' | 'personal')
                    setApproveError('')
                  }}
                >
                  {availablePayBanks.map((bank) => (
                    <option key={bank.scope} value={bank.scope}>
                      {bank.label} • {fmtCurrency(bank.balance, bank.currency)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedApproveBank ? (
              <div className={styles.muted}>
                {te.availableBalance}:{' '}
                {fmtCurrency(selectedApproveBank.balance, selectedApproveBank.currency)}
              </div>
            ) : null}

            {selectedApproveBank &&
            selectedApproveBank.balance < Number(approveTarget.amount || 0) ? (
              <div className={styles.error}>{te.bankNotEnoughBalanceForRequest}</div>
            ) : null}

            {approveError ? <div className={styles.error}>{approveError}</div> : null}

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={closeApproveFlow}>
                {te.cancel}
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={approveRequest}
                disabled={
                  availablePayBanks.length === 0 ||
                  actionLoading === `request-approve-${approveTarget.id}` ||
                  (selectedApproveBank
                    ? selectedApproveBank.balance < Number(approveTarget.amount || 0)
                    : true)
                }
              >
                {actionLoading === `request-approve-${approveTarget.id}`
                  ? te.approving
                  : te.approveRequest}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}