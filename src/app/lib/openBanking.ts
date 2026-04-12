import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { importPKCS8, SignJWT } from 'jose'

export type BankingProvider = 'enable-banking' | 'neonomics'

export type SyncedBankTransaction = {
  externalId: string
  amount: number
  currency: string
  direction: 'in' | 'out'
  bookingDate?: string
  valueDate?: string
  description?: string
  raw?: any
}

export type SelectableBankAccount = {
  externalAccountId: string
  bankName: string
  accountName: string
  maskedAccount: string
  currency: string
}

export type FinishConsentSessionResult = {
  externalSessionId: string
  bankName: string
  accounts: SelectableBankAccount[]
}

export type FinishConsentResult = {
  externalSessionId: string
  externalAccountId: string
  bankName: string
  accountName: string
  maskedAccount: string
  currentBalance: number
  currency: string
}

export type SyncConnectionResult = {
  currentBalance: number
  currency: string
  transactions: SyncedBankTransaction[]
}

type EnableBankingAspsp = {
  name: string
  country: string
  auth_methods?: Array<{
    name?: string
    hidden_method?: boolean
    psu_type?: string
    approach?: string
  }>
}

type EnableBankingAuthResponse = {
  url: string
  authorization_id?: string
}

type EnableBankingAccount = {
  uid?: string
  resource_id?: string
  name?: string
  details?: string
  product?: string
  currency?: string
  account_id?: {
    iban?: string
    other?: {
      identification?: string
    }
  }
  all_account_ids?: Array<{
    identification?: string
    scheme_name?: string
  }>
}

type EnableBankingSessionResponse = {
  session_id: string
  accounts?: EnableBankingAccount[]
  aspsp?: {
    name?: string
    country?: string
  }
}

type EnableBankingBalancesResponse = {
  balances?: Array<{
    name?: string
    balance_type?: string
    balance_amount?: {
      currency?: string
      amount?: string
    }
  }>
}

type EnableBankingTransactionsResponse =
  | {
      transactions?: any[]
      continuation_key?: string
    }
  | {
      booked?: any[]
      pending?: any[]
      continuation_key?: string
    }
  | {
      transactions?: {
        booked?: any[]
        pending?: any[]
      }
      continuation_key?: string
    }

type MockAccountEntry = {
  info?: EnableBankingAccount
  transactions?: any[]
  balances?: EnableBankingBalancesResponse['balances']
}

type MockAccountFile = {
  accounts?: MockAccountEntry[]
}

function isMockMode() {
  return process.env.OPEN_BANKING_MOCK === '1'
}

function getHeader(req: any, key: string) {
  if (typeof req?.headers?.get === 'function') return req.headers.get(key)
  return req?.headers?.[key] ?? null
}

export function buildAppOrigin(req: any) {
  const host = getHeader(req, 'x-forwarded-host') || getHeader(req, 'host')
  const proto = getHeader(req, 'x-forwarded-proto') || 'http'

  if (!host) {
    throw new Error('Missing host header.')
  }

  return `${proto}://${host}`
}

export function buildBankingCallbackUrl(req: any) {
  return `${buildAppOrigin(req)}/api/bank-connections/connect/callback`
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function getEnableBankingConfig() {
  return {
    appId: requireEnv('ENABLE_BANKING_APP_ID'),
    baseUrl: process.env.ENABLE_BANKING_API_BASE_URL || 'https://api.enablebanking.com',
    privateKeyPath: requireEnv('ENABLE_BANKING_PRIVATE_KEY_PATH'),
    aspspName: process.env.ENABLE_BANKING_ASPSP_NAME || 'Nordea',
    aspspCountry: process.env.ENABLE_BANKING_ASPSP_COUNTRY || 'NO',
  }
}

async function createEnableBankingJwt() {
  const { appId, privateKeyPath } = getEnableBankingConfig()

  const absoluteKeyPath = path.isAbsolute(privateKeyPath)
    ? privateKeyPath
    : path.join(process.cwd(), privateKeyPath)

  console.log('ENABLE BANKING PRIVATE KEY PATH', absoluteKeyPath)

  const privateKeyPem = await readFile(absoluteKeyPath, 'utf8')
  const key = await importPKCS8(privateKeyPem, 'RS256')

  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({})
    .setProtectedHeader({
      typ: 'JWT',
      alg: 'RS256',
      kid: appId,
    })
    .setIssuer('enablebanking.com')
    .setAudience('api.enablebanking.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 5)
    .sign(key)
}

async function enableBankingFetch<T>(
  pathname: string,
  init?: RequestInit,
  reqHeaders?: Record<string, string>,
): Promise<T> {
  const { baseUrl } = getEnableBankingConfig()
  const jwt = await createEnableBankingJwt()

  const res = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(reqHeaders || {}),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const text = await res.text()
  let json: any = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const message =
      json?.message ||
      json?.error_description ||
      json?.errors?.[0]?.message ||
      text ||
      `Enable Banking request failed (${res.status})`

    throw new Error(message)
  }

  return json as T
}

async function getAvailableAspsps(): Promise<EnableBankingAspsp[]> {
  const json = await enableBankingFetch<{ aspsps?: EnableBankingAspsp[] }>('/aspsps')
  return Array.isArray(json?.aspsps) ? json.aspsps : []
}

async function findConfiguredAspsp() {
  const { aspspName, aspspCountry } = getEnableBankingConfig()
  const aspsps = await getAvailableAspsps()

  console.log(
    'ENABLE BANKING AVAILABLE ASPSPS',
    aspsps.map((item) => `${item?.name} (${item?.country})`),
  )

  const found = aspsps.find(
    (item) =>
      String(item?.name || '').toLowerCase() === aspspName.toLowerCase() &&
      String(item?.country || '').toUpperCase() === aspspCountry.toUpperCase(),
  )

  if (!found) {
    throw new Error(`ASPSP not found in Enable Banking: ${aspspName} (${aspspCountry})`)
  }

  return found
}

function pickAuthMethod(aspsp: EnableBankingAspsp) {
  const methods = Array.isArray(aspsp.auth_methods) ? aspsp.auth_methods : []
  const visiblePersonal = methods.find(
    (m) =>
      !m?.hidden_method &&
      (!m?.psu_type || m.psu_type === 'personal') &&
      (!m?.approach || m.approach === 'REDIRECT'),
  )

  return visiblePersonal?.name
}

function maskIdentifier(value?: string) {
  const raw = String(value || '').replace(/\s+/g, '')
  if (!raw) return '****'
  const last4 = raw.slice(-4)
  return `**** **** **** ${last4}`
}

function extractAccountIdentifier(account?: EnableBankingAccount) {
  const iban = account?.account_id?.iban
  if (iban) return iban

  const other = account?.account_id?.other?.identification
  if (other) return other

  const alt = Array.isArray(account?.all_account_ids)
    ? account?.all_account_ids.find((item) => item?.identification)?.identification
    : ''

  return alt || ''
}

function extractAccountDisplayName(account?: EnableBankingAccount) {
  return account?.name || account?.product || account?.details || 'Shared family account'
}

function pickCurrentBalance(json: EnableBankingBalancesResponse) {
  const balances = Array.isArray(json?.balances) ? json.balances : []
  if (!balances.length) {
    return {
      amount: 0,
      currency: 'NOK',
    }
  }

  const preferred =
    balances.find((b) =>
      ['CLAV', 'ITAV', 'ITBD'].includes(String(b?.balance_type || '').toUpperCase()),
    ) || balances[0]

  return {
    amount: Number(preferred?.balance_amount?.amount || 0),
    currency: preferred?.balance_amount?.currency || 'NOK',
  }
}

function normalizeDirection(tx: any): 'in' | 'out' {
  const indicator = String(tx?.credit_debit_indicator || '').toUpperCase()
  return indicator === 'CRDT' ? 'in' : 'out'
}

function normalizeTransactionAmount(tx: any) {
  const amount = tx?.transaction_amount?.amount ?? tx?.amount?.amount ?? tx?.amount ?? 0
  return Number(amount || 0)
}

function normalizeTransactionCurrency(tx: any) {
  return tx?.transaction_amount?.currency || tx?.amount?.currency || tx?.currency || 'NOK'
}

function normalizeTransactionDescription(tx: any) {
  if (Array.isArray(tx?.remittance_information) && tx.remittance_information.length) {
    return tx.remittance_information.join(' | ')
  }

  return (
    tx?.bank_transaction_code?.description ||
    tx?.entry_reference ||
    tx?.transaction_id ||
    'Bank transaction'
  )
}

function flattenTransactions(json: EnableBankingTransactionsResponse): any[] {
  const root: any = json || {}

  if (Array.isArray(root.transactions)) return root.transactions
  if (Array.isArray(root.booked) || Array.isArray(root.pending)) {
    return [...(root.booked || []), ...(root.pending || [])]
  }

  if (root.transactions && typeof root.transactions === 'object') {
    return [
      ...(Array.isArray(root.transactions.booked) ? root.transactions.booked : []),
      ...(Array.isArray(root.transactions.pending) ? root.transactions.pending : []),
    ]
  }

  return []
}

function buildPsuHeaders() {
  return {
    'Psu-Ip-Address': '127.0.0.1',
    'Psu-User-Agent': 'SamSam/1.0',
    'Psu-Accept': 'application/json',
    'Psu-Accept-Charset': 'utf-8',
    'Psu-Accept-Encoding': 'gzip, deflate, br',
    'Psu-Accept-language': 'en',
  }
}

async function loadMockAccounts(): Promise<MockAccountEntry[]> {
  const filePath = path.join(process.cwd(), 'mock-norway-account.json')
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as MockAccountFile
  return Array.isArray(parsed?.accounts) ? parsed.accounts : []
}

function toSelectableAccount(
  account: EnableBankingAccount | undefined,
  bankName: string,
): SelectableBankAccount | null {
  if (!account) return null

  const externalAccountId = String(account.uid || account.resource_id || '').trim()
  if (!externalAccountId) return null

  return {
    externalAccountId,
    bankName,
    accountName: extractAccountDisplayName(account),
    maskedAccount: maskIdentifier(extractAccountIdentifier(account)),
    currency: String(account.currency || 'NOK'),
  }
}

function buildNormalizedTransactions(list: any[]): SyncedBankTransaction[] {
  return list.map((tx) => ({
    externalId: String(
      tx?.transaction_id ||
        tx?.entry_reference ||
        `${tx?.booking_date || ''}:${tx?.value_date || ''}:${tx?.transaction_amount?.amount || tx?.amount?.amount || ''}`,
    ),
    amount: normalizeTransactionAmount(tx),
    currency: normalizeTransactionCurrency(tx),
    direction: normalizeDirection(tx),
    bookingDate: tx?.booking_date || undefined,
    valueDate: tx?.value_date || undefined,
    description: normalizeTransactionDescription(tx),
    raw: tx,
  }))
}

export async function startOpenBankingConsent(args: {
  provider: BankingProvider
  state: string
  callbackUrl: string
}) {
  const { provider, state, callbackUrl } = args

  if (provider !== 'enable-banking') {
    throw new Error(`Unsupported provider in real mode: ${provider}`)
  }

  if (isMockMode()) {
    console.log('OPEN BANKING MOCK MODE: startOpenBankingConsent')
    return {
      redirectUrl: `${callbackUrl}?code=mock-code&state=${state}`,
      providerState: state,
    }
  }

  const aspsp = await findConfiguredAspsp()
  const authMethod = pickAuthMethod(aspsp)

  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 90)

  const body: Record<string, any> = {
    access: {
      valid_until: validUntil.toISOString(),
      balances: true,
      transactions: true,
    },
    aspsp: {
      name: aspsp.name,
      country: aspsp.country,
    },
    state,
    redirect_url: callbackUrl,
    psu_type: 'personal',
  }

  if (authMethod) {
    body.auth_method = authMethod
  }

  const json = await enableBankingFetch<EnableBankingAuthResponse>(
    '/auth',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    buildPsuHeaders(),
  )

  if (!json?.url) {
    throw new Error('Enable Banking did not return redirect url.')
  }

  return {
    redirectUrl: json.url,
    providerState: state,
  }
}

export async function finishOpenBankingConsentSession(args: {
  provider: BankingProvider
  code: string
  callbackUrl: string
}): Promise<FinishConsentSessionResult> {
  const { provider, code } = args

  if (!code) {
    throw new Error('Missing authorization code.')
  }

  if (provider !== 'enable-banking') {
    throw new Error(`Unsupported provider in real mode: ${provider}`)
  }

  if (isMockMode()) {
    console.log('OPEN BANKING MOCK MODE: finishOpenBankingConsentSession')

    const accounts = await loadMockAccounts()
    const bankName = 'Mock ASPSP'

    const mapped = accounts
      .map((entry) => toSelectableAccount(entry.info, bankName))
      .filter(Boolean) as SelectableBankAccount[]

    return {
      externalSessionId: `mock-session-${Date.now()}`,
      bankName,
      accounts: mapped,
    }
  }

  const session = await enableBankingFetch<EnableBankingSessionResponse>(
    '/sessions',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    buildPsuHeaders(),
  )

  const bankName = session?.aspsp?.name || getEnableBankingConfig().aspspName
  const mapped = (Array.isArray(session?.accounts) ? session.accounts : [])
    .map((account) => toSelectableAccount(account, bankName))
    .filter(Boolean) as SelectableBankAccount[]

  if (!session?.session_id) {
    throw new Error('Enable Banking session could not be created.')
  }

  return {
    externalSessionId: session.session_id,
    bankName,
    accounts: mapped,
  }
}

export async function finalizeOpenBankingAccountSelection(args: {
  provider: BankingProvider
  externalSessionId?: string
  externalAccountId: string
  bankName?: string
  selectableAccount?: Partial<SelectableBankAccount> | null
}): Promise<FinishConsentResult> {
  const { provider, externalAccountId, bankName, selectableAccount } = args

  if (!externalAccountId) {
    throw new Error('Missing externalAccountId.')
  }

  if (provider !== 'enable-banking') {
    throw new Error(`Unsupported provider in real mode: ${provider}`)
  }

  if (isMockMode()) {
    console.log('OPEN BANKING MOCK MODE: finalizeOpenBankingAccountSelection')

    const accounts = await loadMockAccounts()
    const selected = accounts.find((entry) => {
      const id = String(entry?.info?.uid || entry?.info?.resource_id || '').trim()
      return id === externalAccountId
    })

    if (!selected?.info) {
      throw new Error('Could not find mock account for selection.')
    }

    const balance = pickCurrentBalance({ balances: selected.balances || [] })

    return {
      externalSessionId: args.externalSessionId || `mock-session-${Date.now()}`,
      externalAccountId,
      bankName: bankName || 'Mock ASPSP',
      accountName:
        selectableAccount?.accountName || extractAccountDisplayName(selected.info),
      maskedAccount:
        selectableAccount?.maskedAccount ||
        maskIdentifier(extractAccountIdentifier(selected.info)),
      currentBalance: balance.amount,
      currency: balance.currency,
    }
  }

  const balances = await enableBankingFetch<EnableBankingBalancesResponse>(
    `/accounts/${encodeURIComponent(externalAccountId)}/balances`,
    {
      method: 'GET',
    },
    buildPsuHeaders(),
  )

  const balance = pickCurrentBalance(balances)

  return {
    externalSessionId: args.externalSessionId || '',
    externalAccountId,
    bankName: bankName || getEnableBankingConfig().aspspName,
    accountName: String(selectableAccount?.accountName || 'Selected bank account'),
    maskedAccount: String(selectableAccount?.maskedAccount || '****'),
    currentBalance: balance.amount,
    currency: balance.currency || String(selectableAccount?.currency || 'NOK'),
  }
}

export async function syncOpenBankingConnection(connection: {
  provider: BankingProvider
  externalSessionId?: string
  externalAccountId?: string
  currentBalance?: number
  currency?: string
}): Promise<SyncConnectionResult> {
  const provider = connection.provider

  if (provider !== 'enable-banking') {
    throw new Error(`Unsupported provider in real mode: ${provider}`)
  }

  if (isMockMode()) {
    console.log('OPEN BANKING MOCK MODE: syncOpenBankingConnection')

    const accounts = await loadMockAccounts()
    const selected = accounts.find((entry) => {
      const id = String(entry?.info?.uid || entry?.info?.resource_id || '').trim()
      return id === String(connection.externalAccountId || '')
    })

    if (!selected?.info) {
      throw new Error('Could not find mock account for sync.')
    }

    const balance = pickCurrentBalance({ balances: selected.balances || [] })
    const txs = Array.isArray(selected.transactions) ? selected.transactions : []

    return {
      currentBalance: balance.amount,
      currency: balance.currency,
      transactions: buildNormalizedTransactions(txs),
    }
  }

  if (!connection.externalAccountId) {
    throw new Error('Missing externalAccountId for bank sync.')
  }

  const headers = buildPsuHeaders()
  const accountId = encodeURIComponent(connection.externalAccountId)

  const balances = await enableBankingFetch<EnableBankingBalancesResponse>(
    `/accounts/${accountId}/balances`,
    { method: 'GET' },
    headers,
  )

  const today = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - 3)

  const transactions = await enableBankingFetch<EnableBankingTransactionsResponse>(
    `/accounts/${accountId}/transactions?date_from=${from.toISOString().slice(0, 10)}&date_to=${today
      .toISOString()
      .slice(0, 10)}`,
    { method: 'GET' },
    headers,
  )

  const balance = pickCurrentBalance(balances)
  const flattened = flattenTransactions(transactions)

  return {
    currentBalance: balance.amount,
    currency: balance.currency,
    transactions: buildNormalizedTransactions(flattened),
  }
}