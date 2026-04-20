'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './economy.module.css'

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

function getBankStatusLabel(status: BankConnectionStatus) {
  if (status === 'connected') return 'Connected'
  if (status === 'pending') return 'Pending'
  if (status === 'failed') return 'Failed'
  if (status === 'expired') return 'Expired'
  return 'Not connected'
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Food',
  housing: 'Housing',
  transport: 'Transport',
  health: 'Health',
  school: 'School',
  activities: 'Activities',
  clothes: 'Clothes',
  bills: 'Bills',
  other: 'Other',
}

function getCategoryLabel(category?: string) {
  const key = String(category || 'other').trim().toLowerCase()
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

function fmtCurrency(amount?: number, currency = 'NOK') {
  const value = Number(amount || 0)

  try {
    return new Intl.NumberFormat('nb-NO', {
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

  return d.toLocaleString('nb-NO')
}

function fmtDateOnly(v?: string) {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleDateString('nb-NO')
}

function getFullName(me: MeUser | null) {
  if (!me) return 'My'
  const full = `${String(me.firstName || '').trim()} ${String(me.lastName || '').trim()}`.trim()
  return full || 'My'
}

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

function buildMonthOptions(values: Array<string | undefined>) {
  const set = new Set<string>()

  values.forEach((value) => {
    const parts = getDateParts(value)
    if (parts) set.add(parts.month)
  })

  return Array.from(set)
    .sort((a, b) => Number(a) - Number(b))
    .map((value) => ({
      value,
      label: MONTH_LABELS[Number(value) - 1] || value,
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

export default function EconomyPage() {
  const searchParams = useSearchParams()

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

  const paidListRef = useRef<HTMLDivElement | null>(null)
  const transferListRef = useRef<HTMLDivElement | null>(null)

  const fullName = useMemo(() => getFullName(me), [me])
  const familyStatus = getBankStatus(familyBank)
  const personalStatus = getBankStatus(personalBank)

  const dashboardMonth = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long' })
  }, [])

  const dashboardYear = useMemo(() => {
    return String(new Date().getFullYear())
  }, [])

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
    })
  }, [])


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
    return buildMonthOptions(allPaidPayments.map((item) => item.updatedAt || item.transactionDate))
  }, [allPaidPayments])

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
    return buildMonthOptions(sortedTransfers.map((item) => item.createdAt))
  }, [sortedTransfers])

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
  const shouldScrollCashflowBars = cashflowByCategory.length >= 4

  const maxCashflowCategoryTotal = useMemo(() => {
    return Math.max(
      1,
      ...cashflowByCategory.map((item) => item.pendingAmount + item.paidAmount),
    )
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
        label: `Family bank • ${familyBank.bankName || 'Family bank'}`,
        balance: Number(familyBank.currentBalance || 0),
        currency: familyBank.currency || 'NOK',
      })
    }

    if (isConnectedBank(personalBank)) {
      items.push({
        scope: 'personal',
        label: `Personal bank • ${personalBank.bankName || 'My bank'}`,
        balance: Number(personalBank.currentBalance || 0),
        currency: personalBank.currency || 'NOK',
      })
    }

    return items
  }, [familyBank, personalBank])

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
        label: `Family bank • ${familyBank.bankName || 'Family bank'}`,
        balance: Number(familyBank.currentBalance || 0),
        currency: familyBank.currency || 'NOK',
      })
    }

    if (isConnectedBank(personalBank)) {
      items.push({
        scope: 'personal',
        label: `Personal bank • ${personalBank.bankName || 'My bank'}`,
        balance: Number(personalBank.currentBalance || 0),
        currency: personalBank.currency || 'NOK',
      })
    }

    return items
  }, [familyBank, personalBank])

  useEffect(() => {
    const bankState = searchParams.get('bank')
    const reason = searchParams.get('reason')

    if (bankState === 'connected') {
      setSuccess('Bank connection completed successfully.')
    } else if (bankState === 'failed') {
      setError(
        reason
          ? `Bank connection failed: ${reason}`
          : 'Bank connection failed. Please try again.',
      )
    } else if (bankState === 'select') {
      setSuccess('Choose which bank account you want to use for this connection.')
    }
  }, [searchParams])

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

  function getRelationId(value: any) {
    if (value == null) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (typeof value === 'object' && value.id != null) return String(value.id)
    return ''
  }

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
        throw new Error(meJson?.message || `Could not load current user (${meRes.status})`)
      }

      if (!statusRes.ok) {
        throw new Error(statusJson?.message || `Could not load bank status (${statusRes.status})`)
      }

      if (!transfersRes.ok) {
        throw new Error(
          transfersJson?.message || `Could not load transfer history (${transfersRes.status})`,
        )
      }

      if (!economyTransactionsRes.ok) {
        throw new Error(
          economyTransactionsJson?.message ||
            `Could not load economy transactions (${economyTransactionsRes.status})`,
        )
      }

      if (!childrenRes.ok) {
        throw new Error(childrenJson?.message || `Could not load children (${childrenRes.status})`)
      }

      if (!requestsRes.ok) {
        throw new Error(requestsJson?.message || `Could not load requests (${requestsRes.status})`)
      }

      setMe(meJson?.user ?? meJson ?? null)
      setFamilyBank(statusJson?.familyBank ?? null)
      setPersonalBank(statusJson?.personalBank ?? null)
      setTransfers(transfersJson?.docs ?? [])
      setEconomyTransactions(economyTransactionsJson?.docs ?? [])
      setChildren(childrenJson?.docs ?? [])
      setRequests(requestsJson?.docs ?? [])
    } catch (err: any) {
      setError(err?.message || 'Could not load economy page.')
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
        throw new Error(json?.message || 'Could not start bank connection.')
      }

      if (!json?.redirectUrl) {
        throw new Error('Missing redirect URL.')
      }

      window.location.href = json.redirectUrl
    } catch (err: any) {
      setError(err?.message || 'Could not start bank connection.')
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
        throw new Error(json?.message || 'Could not select bank account.')
      }

      setSuccess(
        `${connectionScope === 'family' ? 'Family' : 'Personal'} bank account selected successfully.`,
      )
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not select bank account.')
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
        throw new Error(json?.message || 'Could not disconnect bank.')
      }

      setSuccess(`${connectionScope === 'family' ? 'Family' : 'Personal'} bank disconnected.`)
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not disconnect bank.')
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
      return setError('Please enter a valid amount greater than 0.')
    }

    if (transferFromScope === transferToScope) {
      return setError('From and To bank must be different.')
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
        throw new Error(json?.message || raw || 'Could not transfer money.')
      }

      setAmount('')
      setNote('')
      setShowTransferModal(false)
      setSuccess('Money transferred successfully.')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not transfer money.')
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
      return setError('Please enter a payment title.')
    }

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return setError('Please enter a valid payment amount greater than 0.')
    }

    if (!paymentDueDate) {
      return setError('Please choose a due date.')
    }

    if (!paymentCategory) {
      return setError('Please choose a category.')
    }

    if (!me?.id) {
      return setError('Missing current user.')
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
        throw new Error(
          json?.message || json?.errors?.[0]?.message || raw || 'Could not create payment item.',
        )
      }

      setPaymentTitle('')
      setPaymentAmount('')
      setPaymentDueDate(toDateInputValue())
      setPaymentDescription('')
      setPaymentCategory('bills')
      setPaymentChildId('')
      setSuccess('Payment item created and added to calendar.')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not create payment item.')
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
        throw new Error(json?.message || 'Could not delete payment item.')
      }

      setSuccess('Payment item deleted.')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not delete payment item.')
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
      return setError('Please enter a request title.')
    }

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return setError('Please enter a valid request amount greater than 0.')
    }

    if (!requestCategory) {
      return setError('Please choose a category.')
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
        throw new Error(json?.message || raw || 'Could not create request.')
      }

      closeRequestModal()
      setSuccess('Request created successfully.')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not create request.')
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
        throw new Error('Selected bank is not available.')
      }

      if (selectedBank.balance < amountToApprove) {
        setApproveError('This bank account does not have enough balance for this request.')
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
        throw new Error(json?.message || raw || 'Could not approve request.')
      }

      closeApproveFlow()
      setSuccess('Request approved successfully.')
      await loadAll()
    } catch (err: any) {
      setApproveError(err?.message || 'Could not approve request.')
    } finally {
      setActionLoading('')
    }
  }

  async function rejectRequest(id: string | number) {
    const decisionNote = window.prompt('Reason for rejection (optional):', '') || ''

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
        throw new Error(json?.message || raw || 'Could not reject request.')
      }

      setSuccess('Request rejected.')
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not reject request.')
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
        throw new Error('Selected bank is not available.')
      }

      if (selectedBank.balance < amountToPay) {
        setPayError('This bank account does not have enough balance to pay this bill.')
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
        const message =
          json?.message || json?.errors?.[0]?.message || raw || 'Could not pay this payment item.'
        setPayError(message)
        throw new Error(message)
      }

      closePayFlow()
      setSuccess('Payment completed successfully.')
      await loadAll()
    } catch (err: any) {
      setPayError(err?.message || 'Could not pay this item.')
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return <div className={styles.loading}>Laster økonomi…</div>
  }

  const familyChoices = getSelectableAccounts(familyBank)
  const personalChoices = getSelectableAccounts(personalBank)

  return (
    <div className={styles.wrapper}>
      <section className={styles.heroBoard}>
        <div className={styles.heroMain}>
          <div className={styles.heroIntro}>
            <div>
              <div className={styles.heroKicker}>Budget planner dashboard</div>
              <h1 className={styles.heroHeading}>Økonomi</h1>
              <p className={styles.heroDescription}>
                Manage payments, requests and transfers in one clear dashboard.
              </p>
            </div>

            <div className={styles.heroDateCard}>
              <div className={styles.heroDateMonth}>{dashboardMonth}</div>
              <div className={styles.heroDateMeta}>
                <span>{dashboardYear}</span>
                <span>Today: {todayLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <aside className={styles.heroAside}>
          <div className={styles.heroActionCard}>
            <div className={styles.heroActionTitle}>Quick actions</div>
            <p className={styles.heroActionText}>
              Open your bank tools or create a request for family support.
            </p>

            <div className={styles.heroActionButtons}>
              <button
                type="button"
                className={styles.iconBankBtnLarge}
                onClick={openBankPanel}
                disabled={actionLoading !== ''}
                aria-label="Open bank panel"
                title="Open bank panel"
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
                <span>Request</span>
                {pendingRequestCount > 0 ? (
                  <span className={styles.heroRequestBadge}>{pendingRequestCount}</span>
                ) : null}
              </button>
            </div>
          </div>
        </aside>
      </section>

      <section className={styles.cashflowGrid}>
        <section className={styles.cashflowCard}>
          <div className={styles.cashflowHeader}>
            <div>
              <div className={styles.cashflowEyebrow}>Cash flow summary</div>
              <div className={styles.cashflowTitle}>Things to pay by category</div>
              <div className={styles.cashflowSub}>
                This table is built directly from your payment items and grouped by category.
              </div>
            </div>

            <div className={styles.cashflowStats}>
              <div className={styles.cashflowStat}>
                <span>Upcoming</span>
                <strong>{fmtCurrency(totalPendingAmount, dashboardCurrency)}</strong>
              </div>
              <div className={styles.cashflowStat}>
                <span>Paid</span>
                <strong>{fmtCurrency(totalPaidAmount, dashboardCurrency)}</strong>
              </div>
            </div>
          </div>

          {cashflowByCategory.length === 0 ? (
            <div className={styles.emptyBox}>No payment categories yet.</div>
          ) : (
            <div
              className={`${styles.tableWrap} ${
                shouldScrollCashflowTable ? styles.cashflowScrollArea : ''
              }`}
            >
              <table className={styles.cashflowTable}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Upcoming</th>
                    <th>Paid</th>
                    <th>Items</th>
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
              <div className={styles.cashflowEyebrow}>Visual breakdown</div>
              <div className={styles.cashflowTitle}>Category usage</div>
              <div className={styles.cashflowSub}>
                Each bar shows total spending volume from Things to pay.
              </div>
            </div>
          </div>

          {cashflowByCategory.length === 0 ? (
            <div className={styles.emptyBox}>No data to visualize yet.</div>
          ) : (
            <div
              className={`${styles.categoryBars} ${
                shouldScrollCashflowBars ? styles.cashflowScrollArea : ''
              }`}
            >
              {cashflowByCategory.map((item) => {
                const total = item.pendingAmount + item.paidAmount
                const paidWidth = (item.paidAmount / maxCashflowCategoryTotal) * 100
                const pendingWidth = (item.pendingAmount / maxCashflowCategoryTotal) * 100

                return (
                  <div key={item.key} className={styles.categoryBarRow}>
                    <div className={styles.categoryBarTop}>
                      <span>{item.label}</span>
                      <strong>{fmtCurrency(total, dashboardCurrency)}</strong>
                    </div>

                    <div className={styles.categoryBarTrack}>
                      <div
                        className={styles.categoryBarPaid}
                        style={{ width: `${paidWidth}%` }}
                      />
                      <div
                        className={styles.categoryBarPending}
                        style={{ width: `${pendingWidth}%` }}
                      />
                    </div>

                    <div className={styles.categoryBarMeta}>
                      <span>Paid: {fmtCurrency(item.paidAmount, dashboardCurrency)}</span>
                      <span>Upcoming: {fmtCurrency(item.pendingAmount, dashboardCurrency)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Things to pay</div>
            <div className={styles.cardSub}>
              Create upcoming payments. Pending items will also appear automatically in the
              calendar.
            </div>
          </div>
        </div>

        <form className={styles.paymentForm} onSubmit={createPaymentItem}>
          <div className={styles.transferRow}>
            <label className={styles.label}>
              Title
              <input
                className={styles.input}
                type="text"
                placeholder="Example: Kindergarten fee"
                value={paymentTitle}
                onChange={(e) => setPaymentTitle(e.target.value)}
                maxLength={120}
              />
            </label>

            <label className={styles.label}>
              Amount
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.transferRow}>
            <label className={styles.label}>
              Due Date
              <input
                className={styles.input}
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              Category
              <select
                className={styles.select}
                value={paymentCategory}
                onChange={(e) => setPaymentCategory(e.target.value)}
              >
                <option value="food">Foods</option>
                <option value="transport">Transport</option>
                <option value="health">Health</option>
                <option value="school">School</option>
                <option value="activities">Activities</option>
                <option value="clothes">Clothes</option>
                <option value="bills">Bills</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className={styles.transferRow}>
            <label className={styles.label}>
              Link to child
              <select
                className={styles.select}
                value={paymentChildId}
                onChange={(e) => setPaymentChildId(e.target.value)}
              >
                <option value="">No child linked</option>
                {children.map((child) => (
                  <option key={String(child.id)} value={String(child.id)}>
                    {child.fullName}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Description (optional)
              <input
                className={styles.input}
                type="text"
                placeholder="Optional short note"
                value={paymentDescription}
                onChange={(e) => setPaymentDescription(e.target.value)}
                maxLength={200}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={actionLoading !== ''}>
              {actionLoading === 'payment-create' ? 'Creating…' : 'Add payment item'}
            </button>
          </div>
        </form>

        {pendingPayments.length === 0 ? (
          <div className={styles.emptyBox}>No upcoming payments yet.</div>
        ) : (
          <div className={styles.list}>
            {pendingPayments.map((item) => (
              <div key={String(item.id)} className={styles.paymentRow}>
                <div>
                  <div className={styles.rowTitle}>{item.title}</div>
                  <div className={styles.rowMeta}>
                    Due: {fmtDateOnly(item.transactionDate)}
                    {item.category ? ` • ${item.category}` : ''}
                    {(() => {
                      const childId = getRelationId(item.child)
                      const childName = childId ? childNameById.get(childId) : ''
                      return childName ? ` • Child: ${childName}` : ''
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
                    Pay
                  </button>

                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => deletePaymentItem(item.id)}
                    disabled={actionLoading !== ''}
                  >
                    {actionLoading === `payment-delete-${item.id}` ? 'Deleting…' : 'Delete'}
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
            <div className={styles.cardTitle}>Recent paid</div>
            <div className={styles.cardSub}>Recently completed payments.</div>
          </div>

          <div className={styles.filterBar}>
            <label className={styles.filterField}>
              Month
              <select
                className={styles.select}
                value={paidMonthFilter}
                onChange={(e) => setPaidMonthFilter(e.target.value)}
              >
                <option value="all">All</option>
                {paidMonthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              Year
              <select
                className={styles.select}
                value={paidYearFilter}
                onChange={(e) => setPaidYearFilter(e.target.value)}
              >
                <option value="all">All</option>
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
          <div className={styles.emptyBox}>No paid items found for this filter.</div>
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
                          <span className={styles.requestBadge}>Request</span>
                        ) : null}
                      </div>
                      <div className={styles.rowMeta}>
                        Paid: {fmtDateTime(item.updatedAt || item.transactionDate)}
                        {item.category ? ` • ${item.category}` : ''}
                        {(() => {
                          const childId = getRelationId(item.child)
                          const childName = childId ? childNameById.get(childId) : ''
                          return childName ? ` • Child: ${childName}` : ''
                        })()}
                        {item.sourceType === 'request' ? ' • From request' : ''}
                        {item.requestCreatedByName
                          ? ` • Requested by: ${item.requestCreatedByName}`
                          : ''}
                        {item.approvedByName ? ` • Approved by: ${item.approvedByName}` : ''}
                        {item.paidFromScope
                          ? ` • Paid from: ${
                              item.paidFromScope === 'family' ? 'Family bank' : 'Personal bank'
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
                  {showAllPaid ? 'see less' : 'see more'}
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
            <div className={styles.cardTitle}>Recent transfers</div>
            <div className={styles.cardSub}>
              Recent transfers between family and personal accounts.
            </div>
          </div>

          <div className={styles.filterBar}>
            <label className={styles.filterField}>
              Month
              <select
                className={styles.select}
                value={transferMonthFilter}
                onChange={(e) => setTransferMonthFilter(e.target.value)}
              >
                <option value="all">All</option>
                {transferMonthOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterField}>
              Year
              <select
                className={styles.select}
                value={transferYearFilter}
                onChange={(e) => setTransferYearFilter(e.target.value)}
              >
                <option value="all">All</option>
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
          <div className={styles.emptyBox}>No transfers found for this filter.</div>
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
                      <div className={styles.rowTitle}>
                        {item.note || 'Transfer between accounts'}
                      </div>
                      <div className={styles.rowMeta}>
                        {item.initiatedByName || 'Unknown user'} • {fmtDateTime(item.createdAt)}
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
                  {showAllTransfers ? 'see less' : 'see more'}
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

      {showBankPanel ? (
        <div className={styles.modalBackdrop} onMouseDown={closeBankPanel}>
          <div
            className={`${styles.modalCard} ${styles.bankModalCard}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalTitle}>Bank connections</div>
            <p className={styles.modalText}>
              Connect your family bank and your personal bank, or manage existing bank connections.
            </p>

            <div className={styles.bankGrid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>Family bank</div>
                    <div className={styles.cardSub}>Shared fund for the whole family.</div>
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
                    <div className={styles.bankName}>{familyBank.bankName || 'Family bank'}</div>
                    <div className={styles.bankInfo}>
                      {familyBank.accountName || 'Shared account'}
                      {familyBank.maskedAccount ? ` • ${familyBank.maskedAccount}` : ''}
                    </div>
                    <div className={styles.balance}>
                      {fmtCurrency(familyBank.currentBalance, familyBank.currency || 'NOK')}
                    </div>
                    <div className={styles.muted}>
                      Last synced: {fmtDateTime(familyBank.lastSyncedAt)}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyBox}>No family bank connected yet.</div>
                )}

                {needsAccountSelection(familyBank) && familyChoices.length > 0 ? (
                  <div className={styles.selectionWrap}>
                    <div className={styles.selectionTitle}>Choose the bank account for Family bank</div>
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
                              ? 'Saving…'
                              : 'Use this account'}
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
                        {actionLoading === 'connect-family' ? 'Connecting…' : 'Connect family bank'}
                      </button>
                    ) : familyStatus === 'pending' ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => startConnect('family')}
                        disabled={actionLoading !== ''}
                      >
                        {actionLoading === 'connect-family' ? 'Opening…' : 'Continue connect'}
                      </button>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => openTransferForm('family')}
                          disabled={actionLoading !== ''}
                        >
                          Transfer
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => disconnectBank('family')}
                          disabled={actionLoading !== ''}
                        >
                          {actionLoading === 'disconnect-family' ? 'Disconnecting…' : 'Disconnect'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>My personal bank</div>
                    <div className={styles.cardSub}>Private bank owned by {fullName}.</div>
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
                    <div className={styles.bankName}>{personalBank.bankName || `${fullName} bank`}</div>
                    <div className={styles.bankInfo}>
                      {personalBank.accountName || 'Personal account'}
                      {personalBank.maskedAccount ? ` • ${personalBank.maskedAccount}` : ''}
                    </div>
                    <div className={styles.balance}>
                      {fmtCurrency(personalBank.currentBalance, personalBank.currency || 'NOK')}
                    </div>
                    <div className={styles.muted}>
                      Last synced: {fmtDateTime(personalBank.lastSyncedAt)}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyBox}>No personal bank connected yet.</div>
                )}

                {needsAccountSelection(personalBank) && personalChoices.length > 0 ? (
                  <div className={styles.selectionWrap}>
                    <div className={styles.selectionTitle}>Choose the bank account for Personal bank</div>
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
                              ? 'Saving…'
                              : 'Use this account'}
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
                        {actionLoading === 'connect-personal' ? 'Connecting…' : 'Connect my bank'}
                      </button>
                    ) : personalStatus === 'pending' ? (
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => startConnect('personal')}
                        disabled={actionLoading !== ''}
                      >
                        {actionLoading === 'connect-personal' ? 'Opening…' : 'Continue connect'}
                      </button>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => openTransferForm('personal')}
                          disabled={actionLoading !== ''}
                        >
                          Transfer
                        </button>

                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => disconnectBank('personal')}
                          disabled={actionLoading !== ''}
                        >
                          {actionLoading === 'disconnect-personal'
                            ? 'Disconnecting…'
                            : 'Disconnect'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={closeBankPanel}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showRequestPanel ? (
        <div className={styles.modalBackdrop} onMouseDown={closeRequestPanel}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Pending requests</div>
            <p className={styles.modalText}>
              These requests are still waiting for review.
            </p>

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
                        Requested by: {item.createdByName || 'Unknown'}
                        {item.category ? ` • ${item.category}` : ''}
                        {childName ? ` • Child: ${childName}` : ''}
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
                            {actionLoading === `request-approve-${item.id}`
                              ? 'Approving…'
                              : 'Approve'}
                          </button>

                          <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => rejectRequest(item.id)}
                            disabled={actionLoading !== ''}
                          >
                            {actionLoading === `request-reject-${item.id}`
                              ? 'Rejecting…'
                              : 'Reject'}
                          </button>
                        </>
                      ) : (
                        <div className={styles.muted}>Waiting for review</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={closeRequestPanel}
              >
                Close
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
                New request
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRequestModal ? (
        <div className={styles.modalBackdrop} onMouseDown={closeRequestModal}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Create request</div>
            <p className={styles.modalText}>Ask for money support from your family.</p>

            <form className={styles.transferForm} onSubmit={createRequest}>
              <div className={styles.transferRow}>
                <label className={styles.label}>
                  Title
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Example: School trip fee"
                    value={requestTitle}
                    onChange={(e) => setRequestTitle(e.target.value)}
                    maxLength={120}
                  />
                </label>

                <label className={styles.label}>
                  Amount
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.transferRow}>
                <label className={styles.label}>
                  Category
                  <select
                    className={styles.select}
                    value={requestCategory}
                    onChange={(e) => setRequestCategory(e.target.value)}
                  >
                    <option value="food">Food</option>
                    <option value="housing">Housing</option>
                    <option value="transport">Transport</option>
                    <option value="health">Health</option>
                    <option value="school">School</option>
                    <option value="activities">Activities</option>
                    <option value="clothes">Clothes</option>
                    <option value="bills">Bills</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label className={styles.label}>
                  Link to child
                  <select
                    className={styles.select}
                    value={requestChildId}
                    onChange={(e) => setRequestChildId(e.target.value)}
                  >
                    <option value="">No child linked</option>
                    {children.map((child) => (
                      <option key={String(child.id)} value={String(child.id)}>
                        {child.fullName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={styles.label}>
                Note / reason
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Explain why you need this request"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  maxLength={300}
                />
              </label>

              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={closeRequestModal}>
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={actionLoading !== ''}
                >
                  {actionLoading === 'request-create' ? 'Creating…' : 'Submit request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showTransferModal ? (
        <div className={styles.modalBackdrop} onMouseDown={closeTransferModal}>
          <div className={styles.modalCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Transfer between accounts</div>
            <p className={styles.modalText}>
              Move money between your personal bank and the shared family account.
            </p>

            {availableTransferBanks.length < 2 ? (
              <div className={styles.emptyBox}>
                Connect both family bank and personal bank first.
              </div>
            ) : (
              <form className={styles.transferForm} onSubmit={submitTransfer}>
                <div className={styles.transferRow}>
                  <label className={styles.label}>
                    From
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
                    To
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
                    Amount
                    <input
                      className={styles.input}
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.01"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>

                  <label className={styles.label}>
                    Note
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Example: Return mistaken transfer"
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
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={actionLoading !== ''}
                  >
                    {actionLoading === 'transfer' ? 'Transferring…' : 'Transfer money'}
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
                <div className={styles.modalTitle}>Pay this item?</div>
                <p className={styles.modalText}>
                  You are about to pay <strong>{payTarget.title}</strong> for{' '}
                  <strong>{fmtCurrency(payTarget.amount, payTarget.currency || 'NOK')}</strong>.
                </p>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={closePayFlow}>
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => setPayStep('select')}
                  >
                    Yes, continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.modalTitle}>Choose bank to pay from</div>

                {availablePayBanks.length === 0 ? (
                  <div className={styles.emptyBox}>No connected bank available for payment.</div>
                ) : (
                  <label className={styles.label}>
                    Bank
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
                    Available balance: {fmtCurrency(
                      selectedPayBank.balance,
                      selectedPayBank.currency,
                    )}
                  </div>
                ) : null}

                {selectedPayBank &&
                payTarget &&
                selectedPayBank.balance < Number(payTarget.amount || 0) ? (
                  <div className={styles.error}>
                    This bank account does not have enough balance to pay this item.
                  </div>
                ) : null}

                {payError ? <div className={styles.error}>{payError}</div> : null}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setPayStep('confirm')}
                  >
                    Back
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
                    {actionLoading === `payment-pay-${payTarget.id}` ? 'Paying…' : 'Pay now'}
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
            <div className={styles.modalTitle}>Approve request</div>

            <p className={styles.modalText}>
              You are about to approve <strong>{approveTarget.title}</strong> for{' '}
              <strong>
                {fmtCurrency(
                  approveTarget.amount,
                  familyBank?.currency || personalBank?.currency || 'NOK',
                )}
              </strong>
              .
            </p>

            {availablePayBanks.length === 0 ? (
              <div className={styles.emptyBox}>No connected bank available for approval.</div>
            ) : (
              <label className={styles.label}>
                Choose bank
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
                Available balance: {fmtCurrency(
                  selectedApproveBank.balance,
                  selectedApproveBank.currency,
                )}
              </div>
            ) : null}

            {selectedApproveBank &&
            selectedApproveBank.balance < Number(approveTarget.amount || 0) ? (
              <div className={styles.error}>
                This bank account does not have enough balance for this request.
              </div>
            ) : null}

            {approveError ? <div className={styles.error}>{approveError}</div> : null}

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryBtn} onClick={closeApproveFlow}>
                Cancel
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
                  ? 'Approving…'
                  : 'Approve request'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}