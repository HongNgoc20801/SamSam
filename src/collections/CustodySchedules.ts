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

function getRelId(v: any) {
  if (v == null) return null
  if (typeof v === 'string' || typeof v === 'number') return v
  return v?.id ?? null
}

function getFamilyIdFromUser(req: any) {
  return getRelId(req?.user?.family)
}

function getUserId(req: any) {
  return getRelId(req?.user?.id)
}

function getActorName(req: any) {
  const u = req?.user
  if (!u) return 'A parent'

  const full = `${String(u.firstName || '').trim()} ${String(u.lastName || '').trim()}`.trim()
  return full || u.fullName || u.name || u.email || 'A parent'
}

async function validateChildBelongsToFamily(req: any, childId: any, familyId: any) {
  if (!childId) throw new Error('Child is required.')

  const child = await req.payload.findByID({
    collection: 'children',
    id: childId,
    req,
    overrideAccess: true,
    depth: 0,
  })

  const childFamilyId = getRelId(child?.family)

  if (!childFamilyId || String(childFamilyId) !== String(familyId)) {
    throw new Error('This child does not belong to your family.')
  }

  return child
}

export const CustodySchedules: CollectionConfig = {
  slug: 'custody-schedules',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'child', 'currentParent', 'startAt', 'endAt', 'status'],
  },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

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

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return {
        family: { equals: familyId },
      }
    },

    delete: ({ req }) => Boolean(req.user),
  },

  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }: any) => {
        const next = { ...(data ?? {}) }

        if (!isCustomer(req) && !isAdmin(req)) {
          throw new Error('Only customers can manage custody schedules.')
        }

        const familyId = getFamilyIdFromUser(req)
        const userId = getUserId(req)

        if (!familyId || !userId) {
          throw new Error('Missing family or user.')
        }

        const merged = { ...(originalDoc ?? {}), ...next }

        const childId = getRelId(merged.child)
        const currentParentId = getRelId(merged.currentParent)
        const nextParentId = getRelId(merged.nextParent)

        if (!childId) throw new Error('Child is required.')
        if (!currentParentId) throw new Error('Current parent is required.')
        if (!nextParentId) throw new Error('Next parent is required.')

        if (String(currentParentId) === String(nextParentId)) {
          throw new Error('Current parent and next parent cannot be the same.')
        }

        await validateChildBelongsToFamily(req, childId, familyId)

        const startAt = new Date(merged.startAt)
        const endAt = new Date(merged.endAt)

        if (Number.isNaN(startAt.getTime())) {
          throw new Error('Start date is invalid.')
        }

        if (Number.isNaN(endAt.getTime())) {
          throw new Error('End date is invalid.')
        }

        if (endAt <= startAt) {
          throw new Error('End date must be after start date.')
        }

        if (operation === 'create') {
          return {
            ...next,
            family: familyId,
            createdBy: userId,
            status: 'active',
            title:
              String(next.title || '').trim() ||
              `Custody period ${startAt.toLocaleDateString()} - ${endAt.toLocaleDateString()}`,
          }
        }

        return next
      },
    ],

    afterChange: [
      async ({ doc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getRelId(doc.family)
        const childId = getRelId(doc.child)
        const actorUserId = getUserId(req)
        const actorName = getActorName(req)

        if (!familyId) return

        await logAudit(req, {
          familyId,
          childId,
          action: operation === 'create' ? 'custody.create' : 'custody.update',
          entityType: 'event',
          scope: 'calendar',
          entityId: String(doc.id),
          summary: operation === 'create' ? 'Created custody schedule' : 'Updated custody schedule',
          meta: {
            title: doc.title,
            startAt: doc.startAt,
            endAt: doc.endAt,
            status: doc.status,
          },
        })

        await notifyFamily(req, {
          familyId,
          actorUserId,
          childId,
          type: 'calendar',
          event: operation === 'create' ? 'created' : 'updated',
          title: doc.title || 'Custody schedule updated',
          message: `${actorName} ${operation === 'create' ? 'created' : 'updated'} a custody schedule.`,
          link: '/dashboard',
          meta: {
            actorName,
            custodyId: doc.id,
            startAt: doc.startAt,
            endAt: doc.endAt,
            status: doc.status,
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
      admin: { readOnly: true },
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
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Changed', value: 'changed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      index: true,
    },
    {
      name: 'handoverStatus',
      type: 'select',
      defaultValue: 'not-ready',
      options: [
        { label: 'Not ready', value: 'not-ready' },
        { label: 'Ready for handover', value: 'ready' },
        { label: 'Handed over', value: 'handed-over' },
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
      admin: { readOnly: true },
    },
  ],
}