
import type { CollectionConfig, Where } from 'payload'
import crypto from 'crypto'

import {
  type BankingProvider,
  buildBankingCallbackUrl,
  finishOpenBankingConsentSession,
  finalizeOpenBankingAccountSelection,
  startOpenBankingConsent,
} from '@/app/lib/openBanking'

function getCollectionSlug(req: any) {
  return req?.user?.collection ?? req?.user?._collection
}

function isAdmin(req: any) {
  return getCollectionSlug(req) === 'users'
}

function isCustomer(req: any) {
  const slug = getCollectionSlug(req)
  if (slug === 'customers') return true

  const u: any = req?.user
  if (u?.role === 'customer') return true
  if (u?.type === 'customer') return true

  return false
}

function normalizeRelId(v: any): string | number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  if (typeof v === 'object' && v?.id != null) {
    return normalizeRelId(v.id)
  }

  return null
}

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return normalizeRelId(u.family)
}

function getUserId(req: any) {
  return normalizeRelId(req?.user?.id)
}

function buildFamilyConnectionWhere(familyId: string | number): Where {
  return {
    and: [
      {
        family: {
          equals: familyId,
        },
      },
      {
        connectionScope: {
          equals: 'family',
        },
      },
      {
        isActive: {
          equals: true,
        },
      },
    ],
  }
}

function buildPersonalConnectionWhere(
  familyId: string | number,
  ownerCustomer: string | number,
): Where {
  return {
    and: [
      {
        family: {
          equals: familyId,
        },
      },
      {
        connectionScope: {
          equals: 'personal',
        },
      },
      {
        ownerCustomer: {
          equals: ownerCustomer,
        },
      },
      {
        isActive: {
          equals: true,
        },
      },
    ],
  }
}

function buildReadableConnectionsWhere(
  familyId: string | number,
  userId: string | number,
): Where {
  return {
    and: [
      {
        family: {
          equals: familyId,
        },
      },
      {
        isActive: {
          equals: true,
        },
      },
      {
        or: [
          {
            connectionScope: {
              equals: 'family',
            },
          },
          {
            and: [
              {
                connectionScope: {
                  equals: 'personal',
                },
              },
              {
                ownerCustomer: {
                  equals: userId,
                },
              },
            ],
          },
        ],
      },
    ],
  }
}

function sanitizeAvailableAccounts(accounts: any[]) {
  return accounts
    .map((item) => ({
      externalAccountId: String(item?.externalAccountId || ''),
      bankName: String(item?.bankName || ''),
      accountName: String(item?.accountName || ''),
      maskedAccount: String(item?.maskedAccount || ''),
      currency: String(item?.currency || 'NOK'),
      currentBalance: Number(item?.currentBalance || 0),
    }))
    .filter((item) => item.externalAccountId)
}

function getErrorMessage(error: any) {
  if (!error) return 'Unknown bank connection error.'
  if (typeof error === 'string') return error
  return (
    error?.message ||
    error?.response?.data?.message ||
    error?.cause?.message ||
    'Unknown bank connection error.'
  )
}

async function findCurrentConnection(
  req: any,
  connectionScope: 'family' | 'personal',
  familyId: string | number,
  userId?: string | number,
) {
  const where =
    connectionScope === 'family'
      ? buildFamilyConnectionWhere(familyId)
      : buildPersonalConnectionWhere(familyId, userId as string | number)

  const found = await req.payload.find({
    collection: 'bank-connections',
    where,
    limit: 1,
    sort: '-updatedAt',
    overrideAccess: true,
    depth: 0,
  })

  return found.docs?.[0] ?? null
}

export const BankConnections: CollectionConfig = {
  slug: 'bank-connections',

  admin: {
    useAsTitle: 'bankName',
    defaultColumns: [
      'provider',
      'connectionScope',
      'bankName',
      'status',
      'maskedAccount',
      'currentBalance',
    ],
  },

  access: {
    create: ({ req }) => !!req.user && isAdmin(req),
    update: ({ req }) => !!req.user && isAdmin(req),
    delete: ({ req }) => !!req.user && isAdmin(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      const userId = getUserId(req)

      if (!familyId || !userId) return false

      return buildReadableConnectionsWhere(familyId, userId)
    },
  },

  endpoints: [
    {
      path: '/status',
      method: 'get',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json(
              { familyBank: null, personalBank: null },
              { status: 200 },
            )
          }

          const [familyBank, personalBank] = await Promise.all([
            findCurrentConnection(req, 'family', familyId),
            findCurrentConnection(req, 'personal', familyId, userId),
          ])

          return Response.json(
            {
              familyBank,
              personalBank,
            },
            { status: 200 },
          )
        } catch (error: any) {
          return Response.json(
            {
              message: error?.message || 'Could not load bank connection status.',
            },
            { status: 500 },
          )
        }
      },
    },

    {
      path: '/connect/start',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can connect a bank.' },
              { status: 403 },
            )
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json(
              { message: 'Your account is not in a family group yet.' },
              { status: 400 },
            )
          }

          const body = await req.json().catch(() => ({} as any))
          const provider = String(body?.provider || 'enable-banking') as BankingProvider
          const connectionScope = String(body?.connectionScope || 'family') as
            | 'family'
            | 'personal'

          if (!['enable-banking', 'neonomics'].includes(provider)) {
            return Response.json({ message: 'Unsupported provider.' }, { status: 400 })
          }

          if (!['family', 'personal'].includes(connectionScope)) {
            return Response.json({ message: 'Unsupported connection scope.' }, { status: 400 })
          }

          const state = crypto.randomUUID()
          const callbackUrl = buildBankingCallbackUrl(req)

          const consentResult: any = await startOpenBankingConsent({
            provider,
            state,
            callbackUrl,
          })

          if (!consentResult?.redirectUrl) {
            throw new Error('Bank provider did not return redirect URL.')
          }

          const current = await findCurrentConnection(
            req,
            connectionScope,
            familyId,
            connectionScope === 'personal' ? userId : undefined,
          )

          const baseData = {
            provider,
            status: 'pending',
            state,
            lastError: '',
            isActive: true,
            connectionScope,
            family: familyId,
            ownerCustomer: connectionScope === 'personal' ? userId : null,
            externalSessionId: String(consentResult?.externalSessionId || ''),
            externalAccountId: '',
            bankName: '',
            accountName: '',
            maskedAccount: '',
            currentBalance: 0,
            currency: 'NOK',
            meta: {
              availableAccounts: [],
              selectionRequired: false,
              selectedAccount: null,
            },
          }

          if (current?.id) {
            await req.payload.update({
              collection: 'bank-connections',
              id: current.id,
              data: baseData as any,
              overrideAccess: true,
              req,
            })
          } else {
            await req.payload.create({
              collection: 'bank-connections',
              data: baseData as any,
              overrideAccess: true,
              req,
            })
          }

          return Response.json({ redirectUrl: consentResult.redirectUrl }, { status: 200 })
        } catch (error: any) {
          return Response.json(
            {
              message: getErrorMessage(error),
            },
            { status: 500 },
          )
        }
      },
    },

    {
      path: '/connect/callback',
      method: 'get',
      handler: async (req: any) => {
        const url = new URL(req.url)
        const origin = url.origin
        const code = url.searchParams.get('code') || ''
        const state = url.searchParams.get('state') || ''
        const providerError = url.searchParams.get('error') || ''
        const providerErrorDescription = url.searchParams.get('error_description') || ''

        try {
          if (providerError) {
            throw new Error(providerErrorDescription || providerError)
          }

          if (!code) {
            return Response.redirect(
              new URL('/economy?bank=failed&reason=missing_code', origin),
              302,
            )
          }

          if (!state) {
            return Response.redirect(
              new URL('/economy?bank=failed&reason=missing_state', origin),
              302,
            )
          }

          const found = await req.payload.find({
            collection: 'bank-connections',
            where: {
              and: [
                {
                  state: {
                    equals: state,
                  },
                },
                {
                  isActive: {
                    equals: true,
                  },
                },
              ],
            },
            limit: 1,
            sort: '-updatedAt',
            overrideAccess: true,
            depth: 0,
          })

          const connection = found.docs?.[0]

          if (!connection?.id) {
            return Response.redirect(
              new URL('/economy?bank=failed&reason=state_not_found', origin),
              302,
            )
          }

          const rawResult: any = await finishOpenBankingConsentSession({
            provider: connection.provider,
            code,
            callbackUrl: buildBankingCallbackUrl(req),
          })

          console.log('BANK CALLBACK RAW RESULT', rawResult)

          const providerResult = rawResult?.result ?? rawResult

          const rawAccounts = Array.isArray(providerResult?.availableAccounts)
            ? providerResult.availableAccounts
            : Array.isArray(providerResult?.accounts)
              ? providerResult.accounts
              : []

          function extractBalance(item: any) {
            const raw =
              item?.currentBalance ??
              item?.balance ??
              item?.availableBalance ??
              item?.balances?.available ??
              item?.balances?.current ??
              item?.balance?.amount ??
              item?.balances?.available?.amount ??
              item?.balances?.current?.amount ??
              0

            const parsed = Number(raw)
            return Number.isFinite(parsed) ? parsed : 0
          }
          console.log('BANK CALLBACK ACCOUNTS', JSON.stringify(rawAccounts, null, 2) ) 

          const availableAccounts = sanitizeAvailableAccounts(
            rawAccounts.map((item: any) => ({
              externalAccountId:
                item?.externalAccountId ||
                item?.accountId ||
                item?.id ||
                '',
              bankName:
                item?.bankName ||
                providerResult?.bankName ||
                '',
              accountName:
                item?.accountName ||
                item?.name ||
                '',
              maskedAccount:
                item?.maskedAccount ||
                item?.accountNumber ||
                item?.iban ||
                '',
              currency:
                item?.currency ||
                item?.balances?.available?.currency ||
                item?.balances?.current?.currency ||
                'NOK',
              currentBalance: extractBalance(item),
            })),
          )

          if (availableAccounts.length > 1) {
            await req.payload.update({
              collection: 'bank-connections',
              id: connection.id,
              data: {
                status: 'pending',
                externalSessionId: providerResult?.externalSessionId || '',
                lastError: '',
                state: '',
                meta: {
                  availableAccounts,
                  selectionRequired: true,
                },
              } as any,
              overrideAccess: true,
              req,
            })

            return Response.redirect(`${url.origin}/economy?bank=select`, 302)
          }

          const selected =
            availableAccounts[0] ??
            (providerResult?.externalAccountId
              ? {
                  externalAccountId: String(providerResult.externalAccountId),
                  bankName: String(providerResult.bankName || ''),
                  accountName: String(providerResult.accountName || ''),
                  maskedAccount: String(providerResult.maskedAccount || ''),
                  currency: String(providerResult.currency || 'NOK'),
                }
              : null)

          if (!selected?.externalAccountId) {
            throw new Error('No bank account returned from provider.')
          }

          const finalized = await finalizeOpenBankingAccountSelection({
            provider: connection.provider,
            externalSessionId: String(
              providerResult?.externalSessionId || rawResult?.externalSessionId || connection?.externalSessionId || '',
            ),
            externalAccountId: selected.externalAccountId,
            bankName: selected.bankName,
            selectableAccount: selected,
          })

          await req.payload.update({
            collection: 'bank-connections',
            id: connection.id,
            data: {
              status: 'connected',
              externalSessionId: finalized.externalSessionId || '',
              externalAccountId: finalized.externalAccountId,
              bankName: finalized.bankName,
              accountName: finalized.accountName,
              maskedAccount: finalized.maskedAccount,
              currentBalance: Number(finalized.currentBalance || 0),
              currency: finalized.currency || 'NOK',
              connectedAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString(),
              lastError: '',
              state: '',
              meta: {
                availableAccounts,
                selectionRequired: false,
                selectedAccount: selected,
              },
            } as any,
            overrideAccess: true,
            req,
          })
          

          return Response.redirect(new URL('/economy?bank=connected', origin), 302)
        } catch (error: any) {
          const reason = getErrorMessage(error)

          try {
            if (state) {
              const found = await req.payload.find({
                collection: 'bank-connections',
                where: {
                  and: [
                    {
                      state: {
                        equals: state,
                      },
                    },
                    {
                      isActive: {
                        equals: true,
                      },
                    },
                  ],
                },
                limit: 1,
                sort: '-updatedAt',
                overrideAccess: true,
                depth: 0,
              })

              const connection = found.docs?.[0]

              if (connection?.id) {
                await req.payload.update({
                  collection: 'bank-connections',
                  id: connection.id,
                  data: {
                    status: 'failed',
                    lastError: reason,
                  } as any,
                  overrideAccess: true,
                  req,
                })
              }
            }

            console.error('BANK CALLBACK FAILED', {
              code,
              state,
              providerError,
              providerErrorDescription,
              reason,
            })

            return Response.redirect(
              new URL(`/economy?bank=failed&reason=${encodeURIComponent(reason)}`, origin),
              302,
            )
          } catch {
            return Response.redirect(new URL('/economy?bank=failed', origin), 302)
          }
        }
      },
    },

    {
      path: '/connect/select-account',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can select a bank account.' },
              { status: 403 },
            )
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json(
              { message: 'Your account is not in a family group yet.' },
              { status: 400 },
            )
          }

          const body = await req.json().catch(() => ({} as any))
          const connectionScope = String(body?.connectionScope || 'family') as
            | 'family'
            | 'personal'
          const externalAccountId = String(body?.externalAccountId || '').trim()

          if (!externalAccountId) {
            return Response.json({ message: 'Missing external account id.' }, { status: 400 })
          }

          if (!['family', 'personal'].includes(connectionScope)) {
            return Response.json({ message: 'Unsupported connection scope.' }, { status: 400 })
          }

          const connection = await findCurrentConnection(
            req,
            connectionScope,
            familyId,
            connectionScope === 'personal' ? userId : undefined,
          )

          if (!connection?.id) {
            return Response.json({ message: 'No pending bank connection found.' }, { status: 404 })
          }

          const availableAccounts = sanitizeAvailableAccounts(
            Array.isArray(connection?.meta?.availableAccounts)
              ? connection.meta.availableAccounts
              : [],
          )

          const selected = availableAccounts.find(
            (item) => item.externalAccountId === externalAccountId,
          )

          if (!selected) {
            return Response.json({ message: 'Selected account was not found.' }, { status: 404 })
          }

          const finalized = await finalizeOpenBankingAccountSelection({
            provider: connection.provider,
            externalSessionId: String(connection.externalSessionId || ''),
            externalAccountId: selected.externalAccountId,
            bankName: selected.bankName,
            selectableAccount: selected,
          })

          await req.payload.update({
            collection: 'bank-connections',
            id: connection.id,
            data: {
              status: 'connected',
              externalSessionId: finalized.externalSessionId || String(connection.externalSessionId || ''),
              externalAccountId: finalized.externalAccountId,
              bankName: finalized.bankName,
              accountName: finalized.accountName,
              maskedAccount: finalized.maskedAccount,
              currentBalance: Number(finalized.currentBalance || 0),
              currency: finalized.currency || 'NOK',
              connectedAt: new Date().toISOString(),
              lastSyncedAt: new Date().toISOString(),
              lastError: '',
              state: '',
              meta: {
                availableAccounts,
                selectionRequired: false,
                selectedAccount: selected,
              },
            } as any,
            overrideAccess: true,
            req,
          })

          return Response.json({ ok: true }, { status: 200 })
        } catch (error: any) {
          return Response.json(
            {
              message: getErrorMessage(error),
            },
            { status: 500 },
          )
        }
      },
    },

    {
      path: '/disconnect',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json({ message: 'Missing family.' }, { status: 400 })
          }

          const body = await req.json().catch(() => ({} as any))
          const connectionScope = String(body?.connectionScope || 'family') as
            | 'family'
            | 'personal'

          const connection = await findCurrentConnection(
            req,
            connectionScope,
            familyId,
            connectionScope === 'personal' ? userId : undefined,
          )

          if (!connection?.id) {
            return Response.json({ ok: true }, { status: 200 })
          }

          await req.payload.update({
            collection: 'bank-connections',
            id: connection.id,
            data: {
              isActive: false,
              status: 'expired',
            } as any,
            overrideAccess: true,
            req,
          })

          return Response.json({ ok: true }, { status: 200 })
        } catch (error: any) {
          return Response.json(
            {
              message: getErrorMessage(error),
            },
            { status: 500 },
          )
        }
      },
    },
  ],

  fields: [
    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
      required: true,
      index: true,
    },
    {
      name: 'connectionScope',
      type: 'select',
      required: true,
      defaultValue: 'family',
      options: [
        { label: 'Family', value: 'family' },
        { label: 'Personal', value: 'personal' },
      ],
      index: true,
    },
    {
      name: 'ownerCustomer',
      type: 'relationship',
      relationTo: 'customers',
      required: false,
      index: true,
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      defaultValue: 'enable-banking',
      options: [
        { label: 'Enable Banking', value: 'enable-banking' },
        { label: 'Neonomics', value: 'neonomics' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Connected', value: 'connected' },
        { label: 'Expired', value: 'expired' },
        { label: 'Failed', value: 'failed' },
      ],
      index: true,
    },
    {
      name: 'state',
      type: 'text',
      required: false,
      index: true,
    },
    {
      name: 'externalSessionId',
      type: 'text',
      required: false,
      index: true,
    },
    {
      name: 'externalAccountId',
      type: 'text',
      required: false,
      index: true,
    },
    {
      name: 'bankName',
      type: 'text',
      required: false,
    },
    {
      name: 'accountName',
      type: 'text',
      required: false,
    },
    {
      name: 'maskedAccount',
      type: 'text',
      required: false,
    },
    {
      name: 'currentBalance',
      type: 'number',
      required: false,
      defaultValue: 0,
    },
    {
      name: 'currency',
      type: 'text',
      required: false,
      defaultValue: 'NOK',
    },
    {
      name: 'connectedAt',
      type: 'date',
      required: false,
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      required: false,
    },
    {
      name: 'lastError',
      type: 'text',
      required: false,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },
    {
      name: 'meta',
      type: 'json',
      required: false,
    },
  ],
}