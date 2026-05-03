import type { CollectionConfig, Where } from 'payload'
import { logAudit } from '@/app/lib/logAudit'
import { notifyFamily } from '@/app/lib/notifications/notifyFamily'

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
  return normalizeRelId(req?.user?.family)
}

function getUserId(req: any) {
  return normalizeRelId(req?.user?.id)
}

function getActorName(req: any) {
  const u = req?.user

  if (!u) return 'A parent'

  const full =
    `${String(u.firstName || '').trim()} ${String(
      u.lastName || '',
    ).trim()}`.trim()

  return full || u.fullName || u.name || u.email || 'A parent'
}

function getDisplayName(doc: any) {
  if (!doc) return ''

  if (typeof doc === 'string' || typeof doc === 'number') {
    return String(doc)
  }

  const full =
    `${String(doc.firstName || '').trim()} ${String(
      doc.lastName || '',
    ).trim()}`.trim()

  return doc.fullName || doc.name || full || doc.email || ''
}

async function findCustomerName(req: any, id: any) {
  const normalizedId = normalizeRelId(id)

  if (!normalizedId) return ''

  const customer = await req.payload
    .findByID({
      collection: 'customers',
      id: normalizedId,
      req,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)

  return getDisplayName(customer)
}

async function findChild(req: any, childId: any) {
  const normalizedId = normalizeRelId(childId)

  if (!normalizedId) return null

  return req.payload
    .findByID({
      collection: 'children',
      id: normalizedId,
      req,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)
}

async function validateChildBelongsToFamily(
  req: any,
  childId: any,
  familyId: any,
) {
  if (!childId) throw new Error('Child is required.')

  const child = await findChild(req, childId)

  const childFamilyId = normalizeRelId(child?.family)

  if (!childFamilyId || String(childFamilyId) !== String(familyId)) {
    throw new Error('This child does not belong to your family.')
  }

  return child
}

async function buildCustodyMeta(
  req: any,
  doc: any,
  actorName: string,
) {
  const childId = normalizeRelId(doc?.child)
  const currentParentId = normalizeRelId(doc?.currentParent)
  const nextParentId = normalizeRelId(doc?.nextParent)
  const actorId = getUserId(req)

  const child = await findChild(req, childId)

  const childName =
    getDisplayName(child) ||
    String(
      (doc?.child as any)?.fullName ||
        (doc?.child as any)?.name ||
        '',
    ).trim()

  const currentParentName =
    getDisplayName(doc?.currentParent) ||
    (await findCustomerName(req, currentParentId))

  const nextParentName =
    getDisplayName(doc?.nextParent) ||
    (await findCustomerName(req, nextParentId))

  return {
    type: 'custody-schedule',
    eventType: 'custody',
    actorId,
    actorName,
    custodyId: doc.id,
    childId,
    childName,
    currentParentId,
    nextParentId,
    currentParentName,
    nextParentName,
    startAt: doc.startAt,
    endAt: doc.endAt,
    status: doc.status,
    handoverStatus: doc.handoverStatus,
    notes: doc.notes || '',
  }
}

async function notifyAndAuditCustody(
  req: any,
  input: {
    doc: any
    operation: 'create' | 'update' | 'delete'
  },
) {
  const { doc, operation } = input

  if (!req?.user || !doc) return

  const familyId = normalizeRelId(doc.family)
  const childId = normalizeRelId(doc.child)
  const actorUserId = getUserId(req)
  const actorName = getActorName(req)

  if (!familyId) return

  const meta = await buildCustodyMeta(req, doc, actorName)

  const action =
    operation === 'create'
      ? 'custody.create'
      : operation === 'delete'
      ? 'custody.delete'
      : 'custody.update'

  const event =
    operation === 'create'
      ? 'created'
      : operation === 'delete'
      ? 'deleted'
      : 'updated'

  const summary =
    operation === 'create'
      ? 'Created custody schedule'
      : operation === 'delete'
      ? 'Deleted custody schedule'
      : 'Updated custody schedule'

  const title =
    operation === 'create'
      ? `Custody period created${
          meta.childName ? ` for ${meta.childName}` : ''
        }`
      : operation === 'delete'
      ? `Custody period deleted${
          meta.childName ? ` for ${meta.childName}` : ''
        }`
      : `Custody period updated${
          meta.childName ? ` for ${meta.childName}` : ''
        }`

  const message =
    operation === 'create'
      ? `${actorName} created a custody period.`
      : operation === 'delete'
      ? `${actorName} deleted a custody period.`
      : `${actorName} updated a custody period.`

  await logAudit(req, {
    familyId,
    childId,
    childName: meta.childName,
    action,
    entityType: 'event',
    scope: 'calendar',
    entityId: String(doc.id),
    summary,
    targetLabel: meta.childName || doc.title || 'Custody period',
    severity: operation === 'delete' ? 'important' : 'info',
    meta,
  })

  await notifyFamily(req, {
    familyId,
    actorUserId,
    childId,
    type: 'calendar',
    event,
    title,
    message,
    link: '/notifications',
    meta,
  })
}

export const CustodySchedules: CollectionConfig = {
  slug: 'custody-schedules',

  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'child',
      'currentParent',
      'nextParent',
      'startAt',
      'endAt',
      'status',
    ],
  },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      const familyId = getFamilyIdFromUser(req)

      if (!familyId) return false

      const where: Where = {
        family: {
          equals: familyId,
        },
      }

      return where
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      const familyId = getFamilyIdFromUser(req)

      if (!familyId) return false

      return {
        family: {
          equals: familyId,
        },
      }
    },

    delete: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      const familyId = getFamilyIdFromUser(req)

      if (!familyId) return false

      return {
        family: {
          equals: familyId,
        },
      }
    },
  },

  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }: any) => {
        const next = { ...(data ?? {}) }

        if (!isCustomer(req) && !isAdmin(req)) {
          throw new Error(
            'Only customers can manage custody schedules.',
          )
        }

        const familyId = getFamilyIdFromUser(req)
        const userId = getUserId(req)

        if (!familyId || !userId) {
          throw new Error('Missing family or user.')
        }

        const merged = { ...(originalDoc ?? {}), ...next }

        const childId = normalizeRelId(merged.child)
        const currentParentId = normalizeRelId(
          merged.currentParent,
        )
        const nextParentId = normalizeRelId(merged.nextParent)

        if (!childId) throw new Error('Child is required.')
        if (!currentParentId) {
          throw new Error('Current parent is required.')
        }
        if (!nextParentId) {
          throw new Error('Next parent is required.')
        }

        if (
          String(currentParentId) === String(nextParentId)
        ) {
          throw new Error(
            'Current parent and next parent cannot be the same.',
          )
        }

        const child = await validateChildBelongsToFamily(
          req,
          childId,
          familyId,
        )

        const startAt = new Date(merged.startAt)
        const endAt = new Date(merged.endAt)

        if (Number.isNaN(startAt.getTime())) {
          throw new Error('Start date is invalid.')
        }

        if (Number.isNaN(endAt.getTime())) {
          throw new Error('End date is invalid.')
        }

        if (endAt <= startAt) {
          throw new Error(
            'End date must be after start date.',
          )
        }

        if (operation === 'create') {
          const childName = getDisplayName(child)

          return {
            ...next,
            family: familyId,
            createdBy: userId,
            status: next.status || 'active',
            handoverStatus:
              next.handoverStatus || 'not-ready',
            title:
              String(next.title || '').trim() ||
              `Custody period${
                childName ? ` for ${childName}` : ''
              }`,
          }
        }

        return next
      },
    ],

    afterChange: [
      async ({ doc, operation, req }: any) => {
        if (
          operation !== 'create' &&
          operation !== 'update'
        )
          return

        await notifyAndAuditCustody(req, {
          doc,
          operation:
            operation === 'create'
              ? 'create'
              : 'update',
        })
      },
    ],

    beforeDelete: [
      async ({ req, id }: any) => {
        const doc = await req.payload
          .findByID({
            collection: 'custody-schedules',
            id,
            req,
            overrideAccess: true,
            depth: 1,
          })
          .catch(() => null)

        if (!doc) return

        await notifyAndAuditCustody(req, {
          doc,
          operation: 'delete',
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
      },
    },

    {
      name: 'child',
      type: 'relationship',
      relationTo: 'children',
      required: true,
      index: true,
    },

    {
      name: 'title',
      type: 'text',
      required: true,
    },

    {
      name: 'currentParent',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },

    {
      name: 'nextParent',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },

    {
      name: 'startAt',
      type: 'date',
      required: true,
      index: true,
    },

    {
      name: 'endAt',
      type: 'date',
      required: true,
      index: true,
    },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Changed', value: 'changed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },

    {
      name: 'handoverStatus',
      type: 'select',
      defaultValue: 'not-ready',
      options: [
        {
          label: 'Not ready',
          value: 'not-ready',
        },
        {
          label: 'Ready for handover',
          value: 'ready',
        },
        {
          label: 'Handed over',
          value: 'handed-over',
        },
      ],
    },

    {
      name: 'notes',
      type: 'textarea',
    },

    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'customers',
      admin: {
        readOnly: true,
      },
    },
  ],
}