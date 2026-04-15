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

async function findBankConnectionForApproval(
  req: any,
  familyId: string | number,
  userId: string | number,
  connectionScope: 'family' | 'personal',
) {
  const where: Where =
    connectionScope === 'family'
      ? {
          and: [
            { family: { equals: familyId } },
            { connectionScope: { equals: 'family' } },
            { isActive: { equals: true } },
            { status: { equals: 'connected' } },
          ],
        }
      : {
          and: [
            { family: { equals: familyId } },
            { connectionScope: { equals: 'personal' } },
            { ownerCustomer: { equals: userId } },
            { isActive: { equals: true } },
            { status: { equals: 'connected' } },
          ],
        }

  const result = await req.payload.find({
    collection: 'bank-connections',
    where,
    limit: 1,
    sort: '-updatedAt',
    overrideAccess: true,
    depth: 0,
    req,
  })

  return result?.docs?.[0] ?? null
}

export const EconomyRequests: CollectionConfig = {
  slug: 'economy-requests',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'amount', 'category', 'status', 'createdAt'],
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

    update: ({ req }) => !!req.user && isAdmin(req),
    delete: ({ req }) => !!req.user && isAdmin(req),
  },

  endpoints: [
    {
      path: '/approve',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can approve requests.' },
              { status: 403 },
            )
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json({ message: 'Missing family or user.' }, { status: 400 })
          }

          const body = await req.json().catch(() => ({} as any))

          const requestId = normalizeRelId(
            body?.requestId ?? body?.id ?? body?.request?.id ?? body?.request,
          )

          const connectionScope = String(body?.connectionScope || 'family') as
            | 'family'
            | 'personal'

          if (!requestId) {
            return Response.json({ message: 'Missing request id.' }, { status: 400 })
          }

          if (!['family', 'personal'].includes(connectionScope)) {
            return Response.json({ message: 'Invalid connection scope.' }, { status: 400 })
          }

          const requestDoc = await req.payload
            .findByID({
              collection: 'economy-requests',
              id: requestId,
              overrideAccess: true,
              depth: 0,
              req,
            })
            .catch(() => null)

          if (!requestDoc?.id) {
            return Response.json({ message: 'Request not found.' }, { status: 404 })
          }

          const requestFamilyId = normalizeRelId(requestDoc.family)
          if (!requestFamilyId || String(requestFamilyId) !== String(familyId)) {
            return Response.json(
              { message: 'This request does not belong to your family.' },
              { status: 403 },
            )
          }

          if (String(normalizeRelId(requestDoc.createdBy)) === String(userId)) {
            return Response.json(
              { message: 'You cannot approve your own request.' },
              { status: 400 },
            )
          }

          if (requestDoc.status !== 'pending') {
            return Response.json(
              {
                message: `Only pending requests can be approved. Current status: ${requestDoc.status}`,
              },
              { status: 400 },
            )
          }

          const bankDoc = await findBankConnectionForApproval(
            req,
            familyId,
            userId,
            connectionScope,
          )

          if (!bankDoc?.id) {
            return Response.json(
              { message: 'No connected bank found for the selected scope.' },
              { status: 404 },
            )
          }

          const amountToApprove = Number(requestDoc.amount || 0)
          const currentBalance = Number(bankDoc.currentBalance || 0)

          if (!Number.isFinite(amountToApprove) || amountToApprove <= 0) {
            return Response.json({ message: 'Invalid request amount.' }, { status: 400 })
          }

          if (currentBalance < amountToApprove) {
            return Response.json(
              { message: 'This bank account does not have enough balance for this request.' },
              { status: 400 },
            )
          }

          const newBalance = currentBalance - amountToApprove
          const now = new Date().toISOString()
          const childId = normalizeRelId(requestDoc.child)

          const updatedBank = await req.payload.update({
            collection: 'bank-connections',
            id: bankDoc.id,
            data: {
              currentBalance: newBalance,
              lastSyncedAt: now,
            } as any,
            overrideAccess: true,
            req,
          })

          const updatedRequest = await req.payload.update({
            collection: 'economy-requests',
            id: requestDoc.id,
            data: {
              status: 'approved',
              reviewedBy: userId,
              reviewedAt: now,
            } as any,
            overrideAccess: true,
            req,
          })

          const paidTransaction = await req.payload.create({
            collection: 'economy-transactions',
            data: {
              title: String(requestDoc.title || 'Approved request').trim(),
              description: 
                String(requestDoc.notes || '').trim() || ' Paid from approved request.',
              amount: amountToApprove,
              type: 'expense',
              status: 'paid',
              category: String(requestDoc.category || 'other'),
              currency: String(bankDoc.currency || 'NOK'),
              transactionDate: now,
              paidBy: userId,
              child: childId ?? undefined,

              sourceType: 'request',
              requestRef: requestDoc.id,
              requestCreatedByName: String(requestDoc.createdByName || 'Unknown'),
              approvedByName: getUserDisplayName(req),
              paidFromScope: connectionScope,
              
            } as any,
            overrideAccess: true,
            req,
          })

          return Response.json(
            {
              ok: true,
              request: updatedRequest,
              bank: updatedBank,
              transaction: paidTransaction,
            },
            { status: 200 },
          )
        } catch (error: any) {
          console.error('APPROVE ERROR:', error)
          return Response.json(
            { message: error?.message || 'Could not approve request.' },
            { status: 500 },
          )
        }
      },
    },

    {
      path: '/reject',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can reject requests.' },
              { status: 403 },
            )
          }

          const familyId = getFamilyIdFromUser(req)
          const userId = getUserId(req)

          if (!familyId || !userId) {
            return Response.json({ message: 'Missing family or user.' }, { status: 400 })
          }

          const body = await req.json().catch(() => ({} as any))
          const requestId = normalizeRelId(
            body?.requestId ?? body?.id ?? body?.request?.id ?? body?.request,
          )
          const decisionNote = String(body?.decisionNote || '').trim()

          if (!requestId) {
            return Response.json({ message: 'Missing request id.' }, { status: 400 })
          }

          const requestDoc = await req.payload
            .findByID({
              collection: 'economy-requests',
              id: requestId,
              overrideAccess: true,
              depth: 0,
              req,
            })
            .catch(() => null)

          if (!requestDoc?.id) {
            return Response.json({ message: 'Request not found.' }, { status: 404 })
          }

          const requestFamilyId = normalizeRelId(requestDoc.family)
          if (!requestFamilyId || String(requestFamilyId) !== String(familyId)) {
            return Response.json(
              { message: 'This request does not belong to your family.' },
              { status: 403 },
            )
          }

          if (String(normalizeRelId(requestDoc.createdBy)) === String(userId)) {
            return Response.json(
              { message: 'You cannot reject your own request.' },
              { status: 400 },
            )
          }

          if (requestDoc.status !== 'pending') {
            return Response.json(
              {
                message: `Only pending requests can be rejected. Current status: ${requestDoc.status}`,
              },
              { status: 400 },
            )
          }

          const updated = await req.payload.update({
            collection: 'economy-requests',
            id: requestDoc.id,
            data: {
              status: 'rejected',
              reviewedBy: userId,
              reviewedAt: new Date().toISOString(),
              decisionNote: decisionNote || undefined,
            } as any,
            overrideAccess: true,
            req,
          })

          return Response.json({ ok: true, request: updated }, { status: 200 })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not reject request.' },
            { status: 500 },
          )
        }
      },
    },
  ],

  hooks: {
    beforeValidate: [
      async ({ data, req, operation }: any) => {
        const next = { ...(data ?? {}) }

        if (operation !== 'create') return next

        if (!isCustomer(req)) {
          throw new Error('Only customers can create requests.')
        }

        const familyId = getFamilyIdFromUser(req)
        const userId = getUserId(req)

        if (!familyId || !userId) {
          throw new Error('Your account is not in a family group yet.')
        }

        const title = String(next.title || '').trim()
        const amount = Number(next.amount || 0)
        const category = String(next.category || 'other').trim()
        const notes = String(next.notes || '').trim()
        const childId = normalizeRelId(next.child)

        if (!title) throw new Error('Title is required.')
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Amount must be greater than 0.')
        }

        const validChildId = await validateChildBelongsToFamily(req, childId, familyId)

        return {
          ...next,
          family: familyId,
          createdBy: userId,
          createdByName: getUserDisplayName(req),
          title,
          amount,
          category,
          notes: notes || undefined,
          child: validChildId ?? null,
          status: 'pending',
        }
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
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'createdByName',
      type: 'text',
      required: true,
      admin: { readOnly: true },
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
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
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
        { label: 'Other', value: 'other' },
      ],
      index: true,
    },
    {
      name: 'notes',
      type: 'textarea',
      required: false,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      index: true,
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'customers',
      required: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'reviewedAt',
      type: 'date',
      required: false,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'decisionNote',
      type: 'textarea',
      required: false,
      admin: { readOnly: true },
    },
  ],
}