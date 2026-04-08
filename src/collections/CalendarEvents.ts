import type { CollectionConfig } from 'payload'
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
  const u: any = req?.user
  if (!u) return null
  return getRelId(u.family)
}

function asText(v: any) {
  if (v === null || v === undefined) return ''

  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }

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

async function canMutateByFamily(req: any, id: string | number) {
  if (!req?.user) return false
  if (isAdmin(req)) return true

  const familyId = getFamilyIdFromUser(req)
  if (!familyId) return false

  const eventDoc = await req.payload
    .findByID({
      collection: 'calendar-events',
      id,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)

  if (!eventDoc) return false

  const docFamilyId = getRelId((eventDoc as any).family)

  return String(docFamilyId) === String(familyId)
}

async function getChildSnapshot(req: any, childValue: any) {
  const childId = getRelId(childValue)

  if (!childId) {
    return {
      childId: null,
      childName: '',
    }
  }

  const child = await req.payload
    .findByID({
      collection: 'children',
      id: childId,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)

  return {
    childId,
    childName: child?.fullName || child?.name || '',
  }
}

export const CalendarEvents: CollectionConfig = {
  slug: 'calendar-events',

  admin: {
    useAsTitle: 'title',
  },

  access: {
    create: ({ req }) => !!req.user && (isAdmin(req) || isCustomer(req)),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return {
        family: { equals: familyId },
      }
    },

    update: async ({ req, id }) => {
      if (!id) return false
      return canMutateByFamily(req, id)
    },

    delete: async ({ req, id }) => {
      if (!id) return false
      return canMutateByFamily(req, id)
    },
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        const familyId = getFamilyIdFromUser(req)
        const userId = getRelId((req.user as any)?.id)

        if (!familyId || !userId) return data

        const childId = (data as any)?.child

        if (!childId) {
          throw new Error('Missing child')
        }

        const child = await req.payload
          .findByID({
            collection: 'children',
            id: childId,
            overrideAccess: true,
            depth: 0,
          })
          .catch(() => null)

        const childFamilyId = getRelId((child as any)?.family)

        if (!childFamilyId || String(childFamilyId) !== String(familyId)) {
          throw new Error('Child does not belong to your family.')
        }

        return {
          ...(data ?? {}),
          family: (data as any)?.family ?? familyId,
          createdBy: (data as any)?.createdBy ?? userId,
        }
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getRelId(doc?.family)
        const actorUserId = getRelId(req?.user?.id)

        const currentChild = await getChildSnapshot(req, doc?.child)

        /**
         * CREATE
         */

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId: currentChild.childId,
            childName: currentChild.childName,
            action: 'event.create',
            entityType: 'event',
            entityId: String(doc?.id),
            scope: 'calendar',
            severity: doc?.status === 'important' ? 'important' : 'info',
            relatedToRole: 'both',
            summary: 'Created calendar event',
            targetLabel: doc?.title,
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId: currentChild.childId,
            type: 'calendar',
            event: 'created',
            title: 'New calendar event',
            message: `${doc?.title || 'An event'} was added`,
            link: '/calendar',
            meta: {
              eventId: doc?.id,
              childName: currentChild.childName,
            },
          })

          return
        }

        /**
         * UPDATE
         */

        if (operation === 'update') {
          const changes: Array<{ field: string; from?: any; to?: any }> = []

          pushChange(changes, 'title', previousDoc?.title, doc?.title)
          pushChange(changes, 'child', getRelId(previousDoc?.child), getRelId(doc?.child))
          pushChange(changes, 'status', previousDoc?.status, doc?.status)
          pushChange(changes, 'startAt', previousDoc?.startAt, doc?.startAt)
          pushChange(changes, 'endAt', previousDoc?.endAt, doc?.endAt)
          pushChange(changes, 'notes', previousDoc?.notes, doc?.notes)
          pushChange(changes, 'allDay', !!previousDoc?.allDay, !!doc?.allDay)

          if (!changes.length) return

          await logAudit(req, {
            familyId,
            childId: currentChild.childId,
            childName: currentChild.childName,
            action: 'event.update',
            entityType: 'event',
            entityId: String(doc?.id),
            scope: 'calendar',
            severity:
              doc?.status === 'important' || previousDoc?.status === 'important'
                ? 'important'
                : 'info',
            relatedToRole: 'both',
            summary: 'Updated calendar event',
            targetLabel: doc?.title,
            changes,
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId: currentChild.childId,
            type: 'calendar',
            event: 'updated',
            title: 'Calendar event updated',
            message: `${doc?.title || 'An event'} was updated`,
            link: '/calendar',
            meta: {
              eventId: doc?.id,
              childName: currentChild.childName,
            },
          })
        }
      },
    ],

    afterDelete: [
      async ({ doc, req }: any) => {
        if (!req?.user || !doc) return

        const actorUserId = getRelId(req?.user?.id)

        const childSnapshot = await getChildSnapshot(req, doc?.child)

        const familyId = getRelId(doc?.family)

        await logAudit(req, {
          familyId,
          childId: childSnapshot.childId,
          childName: childSnapshot.childName,
          action: 'event.delete',
          entityType: 'event',
          entityId: String(doc?.id),
          scope: 'calendar',
          severity: 'important',
          relatedToRole: 'both',
          summary: 'Deleted calendar event',
          targetLabel: doc?.title,
        })

        await notifyFamily(req, {
          familyId,
          actorUserId,
          childId: childSnapshot.childId,
          type: 'calendar',
          event: 'deleted',
          title: 'Calendar event removed',
          message: `${doc?.title || 'An event'} was removed`,
          link: '/calendar',
          meta: {
            eventId: doc?.id,
            childName: childSnapshot.childName,
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
      name: 'notes',
      type: 'textarea',
    },

    {
      name: 'status',
      type: 'select',
      defaultValue: 'admin',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Personlig', value: 'personal' },
        { label: 'Viktig', value: 'important' },
        { label: 'Barn', value: 'child' },
      ],
    },

    {
      name: 'startAt',
      type: 'date',
      required: true,
    },

    {
      name: 'endAt',
      type: 'date',
      required: true,
    },

    {
      name: 'allDay',
      type: 'checkbox',
      defaultValue: false,
    },

    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'customers',
    },
  ],
}