
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
  if (v === null || v === undefined || v === '') return null

  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  if (typeof v === 'object' && v?.id !== undefined && v?.id !== null) {
    return normalizeRelId(v.id)
  }

  return null
}

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return normalizeRelId(u.family)
}

function getFamilyIdFromDoc(doc: any) {
  return normalizeRelId(doc?.family)
}

function cleanText(v: any, max = 5000) {
  return String(v ?? '').trim().slice(0, max)
}

function asText(v: any) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function pushChange(
  changes: Array<{ field: string; from?: any; to?: any }>,
  field: string,
  from: any,
  to: any,
) {
  if (asText(from) !== asText(to)) {
    changes.push({ field, from, to })
  }
}

function getReqContext(req: any) {
  if (!req.context) req.context = {}
  return req.context
}

function buildFamilyBankWhere(familyId: string | number): Where {
  return {
    and: [
      { family: { equals: familyId } },
      { connectionScope: { equals: 'family' } },
      { isActive: { equals: true } },
      { status: { equals: 'connected' } },
    ],
  }
}

function buildPersonalBankWhere(
  familyId: string | number,
  userId: string | number,
): Where {
  return {
    and: [
      { family: { equals: familyId } },
      { connectionScope: { equals: 'personal' } },
      { ownerCustomer: { equals: userId } },
      { isActive: { equals: true } },
      { status: { equals: 'connected' } },
    ],
  }
}

async function validateChildBelongsToFamily(
  req: any,
  childId: string | number | null,
  familyId: string | number | null,
) {
  if (!childId) return null
  if (!familyId) throw new Error('Missing family.')

  const child = await req.payload.findByID({
    collection: 'children',
    id: childId,
    req,
    overrideAccess: true,
    depth: 0,
  })

  const childFamilyId = normalizeRelId(child?.family)

  if (!childFamilyId || String(childFamilyId) !== String(familyId)) {
    throw new Error('This child does not belong to your family.')
  }

  return childId
}

async function validateCustomerBelongsToFamily(
  req: any,
  customerId: string | number | null,
  familyId: string | number | null,
) {
  if (!customerId) return null
  if (!familyId) throw new Error('Missing family.')

  const customer = await req.payload.findByID({
    collection: 'customers',
    id: customerId,
    req,
    overrideAccess: true,
    depth: 0,
  })

  const customerFamilyId = normalizeRelId(customer?.family)

  if (!customerFamilyId || String(customerFamilyId) !== String(familyId)) {
    throw new Error('Selected family member does not belong to your family.')
  }

  return customerId
}

function shouldSyncPaymentToCalendar(doc: any) {
  return String(doc?.type || '') === 'expense' && String(doc?.status || '') === 'pending'
}

function buildPaymentCalendarNotes(doc: any) {
  const parts = [
    `Amount: ${Number(doc?.amount || 0)} ${String(doc?.currency || 'NOK')}`,
    doc?.category ? `Category: ${String(doc.category)}` : '',
    doc?.description ? `Note: ${String(doc.description)}` : '',
  ].filter(Boolean)

  return parts.join('\n')
}

async function findLinkedPaymentCalendarEvent(req: any, economyTransactionId: string | number) {
  const found = await req.payload.find({
    collection: 'calendar-events',
    where: {
      linkedEconomyTransaction: {
        equals: economyTransactionId,
      },
    },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  return found.docs?.[0] ?? null
}

async function removeLinkedPaymentCalendarEventByTransactionId(
  req: any,
  economyTransactionId: string | number,
) {
  const existing = await findLinkedPaymentCalendarEvent(req, economyTransactionId)
  if (!existing?.id) return

  const ctx = getReqContext(req)
  ctx.__skipCalendarToEconomyCascade = true

  await req.payload.delete({
    collection: 'calendar-events',
    id: existing.id,
    overrideAccess: true,
    req,
  })
}

async function upsertPaymentCalendarEvent(req: any, doc: any) {
  if (!shouldSyncPaymentToCalendar(doc)) return

  const existing = await findLinkedPaymentCalendarEvent(req, doc.id)

  const txDate = new Date(doc.transactionDate)
  if (Number.isNaN(txDate.getTime())) return

  const startAt = new Date(txDate)
  startAt.setHours(0, 0, 0, 0)

  const endAt = new Date(startAt)
  endAt.setDate(endAt.getDate() + 1)

  const data = {
    family: normalizeRelId(doc.family),
    child: normalizeRelId(doc.child) ?? null,
    linkedEconomyTransaction: doc.id,
    title: doc.title,
    notes: buildPaymentCalendarNotes(doc),
    status: 'payment',
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    allDay: true,
  } as any

  if (existing?.id) {
    await req.payload.update({
      collection: 'calendar-events',
      id: existing.id,
      data,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'calendar-events',
      data,
      overrideAccess: true,
      req,
    })
  }
}

export const EconomyTransactions: CollectionConfig = {
  slug: 'economy-transactions',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'amount', 'category', 'transactionDate'],
  },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

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

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      const userId = normalizeRelId((req.user as any)?.id)

      if (!familyId || !userId) return false

      const where: Where = {
        and: [{ family: { equals: familyId } }, { createdBy: { equals: userId } }],
      }

      return where
    },

    delete: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      const userId = normalizeRelId((req.user as any)?.id)

      if (!familyId || !userId) return false

      const where: Where = {
        and: [{ family: { equals: familyId } }, { createdBy: { equals: userId } }],
      }

      return where
    },
  },

  endpoints: [
    {
      path: '/pay',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json({ message: 'Only customers can pay items.' }, { status: 403 })
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = normalizeRelId((req.user as any)?.id)

          if (!familyId || !userId) {
            return Response.json({ message: 'Missing family or user.' }, { status: 400 })
          }

          const body = await req.json().catch(() => ({} as any))
          const transactionId = normalizeRelId(body?.transactionId)
          const connectionScope = String(body?.connectionScope || '').trim()

          if (!transactionId) {
            return Response.json({ message: 'Missing transaction id.' }, { status: 400 })
          }

          if (!['family', 'personal'].includes(connectionScope)) {
            return Response.json({ message: 'Invalid bank selection.' }, { status: 400 })
          }

          const tx = await req.payload
            .findByID({
              collection: 'economy-transactions',
              id: transactionId,
              overrideAccess: true,
              depth: 0,
            })
            .catch(() => null)

          if (!tx?.id) {
            return Response.json({ message: 'Payment item not found.' }, { status: 404 })
          }

          const txFamilyId = normalizeRelId(tx.family)
          if (!txFamilyId || String(txFamilyId) !== String(familyId)) {
            return Response.json({ message: 'This payment does not belong to your family.' }, { status: 403 })
          }

          if (String(tx.type) !== 'expense' || String(tx.status) !== 'pending') {
            return Response.json({ message: 'Only pending expense items can be paid.' }, { status: 400 })
          }

          const bankFound =
            connectionScope === 'family'
              ? await req.payload.find({
                  collection: 'bank-connections',
                  where: buildFamilyBankWhere(familyId),
                  limit: 1,
                  overrideAccess: true,
                  depth: 0,
                })
              : await req.payload.find({
                  collection: 'bank-connections',
                  where: buildPersonalBankWhere(familyId, userId),
                  limit: 1,
                  overrideAccess: true,
                  depth: 0,
                })

          const bank = bankFound.docs?.[0]

          if (!bank?.id) {
            return Response.json(
              {
                message:
                  connectionScope === 'family'
                    ? 'No connected family bank found.'
                    : 'No connected personal bank found.',
              },
              { status: 400 },
            )
          }

          const amount = Number(tx.amount || 0)
          const bankBalance = Number(bank.currentBalance || 0)

          if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json({ message: 'Invalid payment amount.' }, { status: 400 })
          }

          if (bankBalance < amount) {
            return Response.json({ message: 'Not enough money in the selected bank.' }, { status: 400 })
          }

          const nextBalance = Number((bankBalance - amount).toFixed(2))
          const now = new Date().toISOString()

          await req.payload.update({
            collection: 'bank-connections',
            id: bank.id,
            data: {
              currentBalance: nextBalance,
              lastSyncedAt: now,
              lastError: '',
            } as any,
            overrideAccess: true,
            req,
          })

          const updatedTx = await req.payload.update({
            collection: 'economy-transactions',
            id: tx.id,
            data: {
              status: 'paid',
            } as any,
            overrideAccess: true,
            req,
          })

          await logAudit(req, {
            familyId,
            childId: normalizeRelId(tx.child),
            action: 'economy.transaction.pay',
            entityType: 'other',
            entityId: String(tx.id),
            summary: 'Paid finance item from selected bank',
            meta: {
              title: tx.title,
              amount,
              currency: tx.currency || bank.currency || 'NOK',
              connectionScope,
              bankConnectionId: String(bank.id),
              resultingBalance: nextBalance,
            },
          })

          return Response.json(
            {
              ok: true,
              transaction: updatedTx,
              connectionScope,
              bankBalance: nextBalance,
            },
            { status: 200 },
          )
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not pay item.' },
            { status: 500 },
          )
        }
      },
    },
  ],

  hooks: {
    beforeValidate: [
      async (args: any) => {
        const { data, req, operation } = args
        const originalDoc = args?.originalDoc ?? args?.previousDoc ?? args?.doc ?? null

        const next: any = { ...(data ?? {}) }

        if (next.title !== undefined) next.title = cleanText(next.title, 120)
        if (next.description !== undefined) next.description = cleanText(next.description, 2000)

        const userId = normalizeRelId((req.user as any)?.id)
        const userFamilyId = getFamilyIdFromUser(req)

        const currentFamilyId =
          normalizeRelId(next.family) ??
          normalizeRelId(originalDoc?.family) ??
          normalizeRelId(userFamilyId)

        if (!currentFamilyId) {
          throw new Error('Your account is not in a family group yet.')
        }

        if (operation === 'create') {
          if (!isCustomer(req)) {
            throw new Error('Only customers can create finance entries.')
          }

          if (!userId) {
            throw new Error('Missing current user.')
          }
        }

        const resolvedTitle =
          'title' in next ? cleanText(next.title, 120) : cleanText(originalDoc?.title, 120)

        if (!resolvedTitle) {
          throw new Error('Title is required.')
        }

        const rawAmount =
          'amount' in next ? Number(next.amount) : Number(originalDoc?.amount ?? 0)

        if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
          throw new Error('Amount must be greater than 0.')
        }

        const resolvedType = String(next.type ?? originalDoc?.type ?? 'expense').trim()
        if (!['expense', 'income'].includes(resolvedType)) {
          throw new Error('Invalid finance type.')
        }

        const resolvedCategory = String(next.category ?? originalDoc?.category ?? 'other').trim()
        const resolvedStatus = String(next.status ?? originalDoc?.status ?? 'paid').trim()
        const resolvedCurrency = String(next.currency ?? originalDoc?.currency ?? 'NOK').trim()

        const resolvedDate =
          next.transactionDate ?? originalDoc?.transactionDate ?? new Date().toISOString()

        const childId =
          'child' in next ? normalizeRelId(next.child) : normalizeRelId(originalDoc?.child)

        const paidById =
          'paidBy' in next
            ? normalizeRelId(next.paidBy)
            : normalizeRelId(originalDoc?.paidBy) ?? userId

        const validChildId = await validateChildBelongsToFamily(req, childId, currentFamilyId)
        const validPaidById = await validateCustomerBelongsToFamily(req, paidById, currentFamilyId)

        if (operation === 'create') {
          return {
            ...next,
            family: currentFamilyId,
            createdBy: userId,
            paidBy: validPaidById,
            child: validChildId ?? null,
            title: resolvedTitle,
            description: cleanText(next.description, 2000) || undefined,
            amount: rawAmount,
            type: resolvedType,
            category: resolvedCategory || 'other',
            status: resolvedStatus || 'paid',
            currency: resolvedCurrency || 'NOK',
            transactionDate: resolvedDate,
          }
        }

        if (operation === 'update') {
          return {
            ...next,
            family: normalizeRelId(originalDoc?.family) ?? currentFamilyId,
            createdBy: normalizeRelId(originalDoc?.createdBy) ?? userId,
            paidBy: validPaidById,
            child: validChildId ?? null,
            title: resolvedTitle,
            description:
              'description' in next
                ? cleanText(next.description, 2000) || undefined
                : cleanText(originalDoc?.description, 2000) || undefined,
            amount: rawAmount,
            type: resolvedType,
            category: resolvedCategory || 'other',
            status: resolvedStatus || 'paid',
            currency: resolvedCurrency || 'NOK',
            transactionDate: resolvedDate,
          }
        }

        return next
      },
    ],

    beforeDelete: [
      async ({ req, id }: any) => {
        if (!req?.user || !id) return

        const existing = await findLinkedPaymentCalendarEvent(req, id).catch(() => null)
        const ctx = getReqContext(req)
        ctx.__linkedCalendarEventId = existing?.id ? String(existing.id) : null
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getFamilyIdFromDoc(doc)
        const childId = normalizeRelId(doc?.child)

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId,
            action: 'economy.transaction.create',
            entityType: 'other',
            entityId: String(doc?.id),
            summary: 'Created finance entry',
            meta: {
              title: doc?.title,
              type: doc?.type,
              amount: doc?.amount,
              category: doc?.category,
              transactionDate: doc?.transactionDate,
            },
          })

          await upsertPaymentCalendarEvent(req, doc)
          return
        }

        if (operation === 'update') {
          const changes: Array<{ field: string; from?: any; to?: any }> = []

          pushChange(changes, 'title', previousDoc?.title, doc?.title)
          pushChange(changes, 'description', previousDoc?.description, doc?.description)
          pushChange(changes, 'type', previousDoc?.type, doc?.type)
          pushChange(changes, 'amount', previousDoc?.amount, doc?.amount)
          pushChange(changes, 'category', previousDoc?.category, doc?.category)
          pushChange(changes, 'status', previousDoc?.status, doc?.status)
          pushChange(changes, 'currency', previousDoc?.currency, doc?.currency)
          pushChange(changes, 'transactionDate', previousDoc?.transactionDate, doc?.transactionDate)
          pushChange(
            changes,
            'child',
            normalizeRelId(previousDoc?.child),
            normalizeRelId(doc?.child),
          )
          pushChange(
            changes,
            'paidBy',
            normalizeRelId(previousDoc?.paidBy),
            normalizeRelId(doc?.paidBy),
          )

          if (changes.length) {
            await logAudit(req, {
              familyId,
              childId,
              action: 'economy.transaction.update',
              entityType: 'other',
              entityId: String(doc?.id),
              summary: 'Updated finance entry',
              changes,
              meta: {
                title: doc?.title,
                type: doc?.type,
                amount: doc?.amount,
                category: doc?.category,
              },
            })
          }

          if (shouldSyncPaymentToCalendar(doc)) {
            await upsertPaymentCalendarEvent(req, doc)
          } else {
            await removeLinkedPaymentCalendarEventByTransactionId(req, doc.id)
          }
        }
      },
    ],

    afterDelete: [
      async ({ doc, req }: any) => {
        if (!req?.user || !doc) return

        const ctx = getReqContext(req)
        const linkedCalendarEventId = ctx.__linkedCalendarEventId

        if (linkedCalendarEventId) {
          ctx.__skipCalendarToEconomyCascade = true

          await req.payload
            .delete({
              collection: 'calendar-events',
              id: linkedCalendarEventId,
              overrideAccess: true,
              req,
            })
            .catch(() => null)
        }

        await logAudit(req, {
          familyId: getFamilyIdFromDoc(doc),
          childId: normalizeRelId(doc?.child),
          action: 'economy.transaction.delete',
          entityType: 'other',
          entityId: String(doc?.id),
          summary: 'Deleted finance entry',
          meta: {
            title: doc?.title,
            type: doc?.type,
            amount: doc?.amount,
            category: doc?.category,
          },
        })
      },
    ],
  },

  fields: [
    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'paidBy',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'child',
      type: 'relationship',
      relationTo: 'children',
      required: false,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'expense',
      options: [
        { label: 'Expense', value: 'expense' },
        { label: 'Income', value: 'income' },
      ],
      index: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'Food', value: 'food' },
        { label: 'Housing', value: 'housing' },
        { label: 'Transport', value: 'transport' },
        { label: 'Health', value: 'health' },
        { label: 'School', value: 'school' },
        { label: 'Activities', value: 'activities' },
        { label: 'Clothes', value: 'clothes' },
        { label: 'Bills', value: 'bills' },
        { label: 'Salary', value: 'salary' },
        { label: 'Other', value: 'other' },
      ],
      index: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'NOK',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'paid',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
      ],
      index: true,
    },
    {
      name: 'transactionDate',
      type: 'date',
      required: true,
      index: true,
    },

    {
      name: 'sourceType',
      type: 'select',
      required: false,
      options: [
        { label: 'Payment', value: 'payment' },
        { label: 'Request', value: 'request' },
      ],
      index: true,
    },
    {
      name: 'requestRef',
      type: 'relationship',
      relationTo: 'economy-requests',
      required: false,
      index: true,
    },
    {
      name: 'requestCreatedByName',
      type: 'text',
      required: false,
    },
    {
      name: 'approvedByName',
      type: 'text',
      required: false,
    },
    {
      name: 'paidFromScope',
      type: 'select',
      required: false,
      options: [
        { label: 'Family', value: 'family' },
        { label: 'Personal', value: 'personal' },
      ],
    },
  ],
}



