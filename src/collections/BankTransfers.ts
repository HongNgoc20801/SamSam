import type { CollectionConfig, Where } from 'payload'
import { logAudit } from '@/app/lib/logAudit'

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
  if (v == null || v === '') return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return null
    return /^\d+$/.test(t) ? Number(t) : t
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

function getUserDisplayName(req: any) {
  const u: any = req?.user
  if (!u) return 'Unknown user'

  const full = `${String(u?.firstName ?? '').trim()} ${String(u?.lastName ?? '').trim()}`.trim()
  return full || u?.fullName || u?.name || u?.email || String(u?.id)
}

function buildFamilyBankWhere(familyId: string | number): Where {
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
      {
        status: {
          equals: 'connected',
        },
      },
    ],
  }
}

function buildPersonalBankWhere(
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
        connectionScope: {
          equals: 'personal',
        },
      },
      {
        ownerCustomer: {
          equals: userId,
        },
      },
      {
        isActive: {
          equals: true,
        },
      },
      {
        status: {
          equals: 'connected',
        },
      },
    ],
  }
}

function getScopeLabel(scope: 'family' | 'personal') {
  return scope === 'family' ? 'family bank' : 'personal bank'
}

export const BankTransfers: CollectionConfig = {
  slug: 'bank-transfers',

  admin: {
    useAsTitle: 'note',
    defaultColumns: ['amount', 'currency', 'status', 'createdAt'],
  },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return {
        family: {
          equals: familyId,
        },
      }
    },

    update: ({ req }) => !!req.user && isAdmin(req),
    delete: ({ req }) => !!req.user && isAdmin(req),
  },

  endpoints: [
    {
      path: '/transfer',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can transfer money.' },
              { status: 403 },
            )
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json(
              { message: 'Missing family or user.' },
              { status: 400 },
            )
          }

          const body = await req.json().catch(() => ({} as any))
          const amount = Number(body?.amount)
          const note = String(body?.note || '')
            .trim()
            .slice(0, 160)

          const fromScope = String(body?.fromScope || 'personal') as
            | 'family'
            | 'personal'
          const toScope = String(body?.toScope || 'family') as
            | 'family'
            | 'personal'

          if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json(
              { message: 'Amount must be greater than 0.' },
              { status: 400 },
            )
          }

          if (!['family', 'personal'].includes(fromScope) || !['family', 'personal'].includes(toScope)) {
            return Response.json(
              { message: 'Invalid bank selection.' },
              { status: 400 },
            )
          }

          if (fromScope === toScope) {
            return Response.json(
              { message: 'From and To bank must be different.' },
              { status: 400 },
            )
          }

          const [personalFound, familyFound] = await Promise.all([
            req.payload.find({
              collection: 'bank-connections',
              where: buildPersonalBankWhere(familyId, userId),
              limit: 1,
              overrideAccess: true,
              depth: 0,
            }),
            req.payload.find({
              collection: 'bank-connections',
              where: buildFamilyBankWhere(familyId),
              limit: 1,
              overrideAccess: true,
              depth: 0,
            }),
          ])

          const personalBank = personalFound.docs?.[0]
          const familyBank = familyFound.docs?.[0]

          if (!personalBank?.id) {
            return Response.json(
              { message: 'No connected personal bank found.' },
              { status: 400 },
            )
          }

          if (!familyBank?.id) {
            return Response.json(
              { message: 'No connected family bank found.' },
              { status: 400 },
            )
          }

          const fromBank = fromScope === 'personal' ? personalBank : familyBank
          const toBank = toScope === 'personal' ? personalBank : familyBank

          const fromBalance = Number(fromBank.currentBalance || 0)
          const toBalance = Number(toBank.currentBalance || 0)
          const currency = String(fromBank.currency || toBank.currency || 'NOK')

          if (String(toBank.currency || currency) !== currency) {
            return Response.json(
              {
                message: 'Both banks must use the same currency.',
              },
              { status: 400 },
            )
          }

          if (fromBalance < amount) {
            return Response.json(
              {
                message: `Not enough money in the selected ${getScopeLabel(fromScope)}.`,
              },
              { status: 400 },
            )
          }

          const nextFromBalance = Number((fromBalance - amount).toFixed(2))
          const nextToBalance = Number((toBalance + amount).toFixed(2))
          const now = new Date().toISOString()

          await Promise.all([
            req.payload.update({
              collection: 'bank-connections',
              id: fromBank.id,
              data: {
                currentBalance: nextFromBalance,
                lastSyncedAt: now,
                lastError: '',
              } as any,
              overrideAccess: true,
              req,
            }),
            req.payload.update({
              collection: 'bank-connections',
              id: toBank.id,
              data: {
                currentBalance: nextToBalance,
                lastSyncedAt: now,
                lastError: '',
              } as any,
              overrideAccess: true,
              req,
            }),
          ])

          const created = await req.payload.create({
            collection: 'bank-transfers',
            data: {
              family: familyId,
              initiatedBy: userId,
              initiatedByName: getUserDisplayName(req),
              fromConnection: fromBank.id,
              toConnection: toBank.id,
              amount,
              currency,
              note:
                note ||
                `Transfer from ${getScopeLabel(fromScope)} to ${getScopeLabel(toScope)}`,
              status: 'completed',
            } as any,
            overrideAccess: true,
            req,
          })

          await logAudit(req, {
            familyId,
            childId: null,
            action: 'bank.transfer',
            entityType: 'other',
            entityId: String(created?.id),
            summary: 'Transferred money between family and personal bank',
            meta: {
              amount,
              currency,
              fromScope,
              toScope,
              fromConnection: String(fromBank.id),
              toConnection: String(toBank.id),
              note:
                note ||
                `Transfer from ${getScopeLabel(fromScope)} to ${getScopeLabel(toScope)}`,
            },
          })

          return Response.json(
            {
              ok: true,
              transfer: created,
              fromScope,
              toScope,
              fromBalance: nextFromBalance,
              toBalance: nextToBalance,
              currency,
            },
            { status: 200 },
          )
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not transfer money.' },
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
      name: 'initiatedBy',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'initiatedByName',
      type: 'text',
      required: true,
    },
    {
      name: 'fromConnection',
      type: 'relationship',
      relationTo: 'bank-connections',
      required: true,
    },
    {
      name: 'toConnection',
      type: 'relationship',
      relationTo: 'bank-connections',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'NOK',
    },
    {
      name: 'note',
      type: 'text',
      required: false,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'completed',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
      ],
    },
  ],
}