import type { CollectionConfig, Where } from 'payload'

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
  if (typeof v === 'object' && v?.id != null) return normalizeRelId(v.id)
  return null
}

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return normalizeRelId(u.family)
}

export const BankTransactions: CollectionConfig = {
  slug: 'bank-transactions',

  admin: {
    useAsTitle: 'description',
    defaultColumns: ['bookingDate', 'amount', 'currency', 'direction'],
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
      if (!familyId) return false

      const where: Where = {
        family: { equals: familyId },
      }

      return where
    },
  },

  fields: [
    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
      required: true,
      index: true,
    },
    {
      name: 'bankConnection',
      type: 'relationship',
      relationTo: 'bank-connections',
      required: true,
      index: true,
    },
    {
      name: 'transactionKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'externalTransactionId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'direction',
      type: 'select',
      required: true,
      options: [
        { label: 'In', value: 'in' },
        { label: 'Out', value: 'out' },
      ],
      index: true,
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
      name: 'bookingDate',
      type: 'date',
      required: false,
      index: true,
    },
    {
      name: 'valueDate',
      type: 'date',
      required: false,
    },
    {
      name: 'description',
      type: 'text',
      required: false,
    },
    {
      name: 'raw',
      type: 'json',
      required: false,
    },
  ],
}