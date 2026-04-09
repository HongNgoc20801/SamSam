import type { CollectionConfig } from 'payload'
import { logAudit } from '@/app/lib/logAudit'
import { notifyFamily } from '@/app/lib/notifications/notifyFamily'

type ChangeItem = {
  field: string
  from?: any
  to?: any
}

function getCollectionSlug(req: any) {
  return req?.user?.collection ?? req?.user?._collection ?? null
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

function getActorRelation(req: any): 'customers' | 'users' {
  return getCollectionSlug(req) === 'users' ? 'users' : 'customers'
}

function getRelId(v: any) {
  if (v == null) return null
  if (typeof v === 'string' || typeof v === 'number') return v
  if (typeof v === 'object' && 'value' in v) return v.value ?? null
  return v?.id ?? null
}

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return getRelId(u.family)
}

function getFamilyIdFromDoc(doc: any) {
  return getRelId(doc?.family)
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

function normalizeStatusValue(status?: string) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return ''
  if (s === 'admin') return 'admin'
  if (s === 'personal') return 'personal'
  if (s === 'important') return 'important'
  if (s === 'child') return 'child'
  return s
}

function normalizeChangeValue(field: string, value: any) {
  if (value === null || value === undefined) return ''

  if (field === 'startAt' || field === 'endAt') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
    return String(value)
  }

  if (field === 'allDay') {
    return value ? 'true' : 'false'
  }

  if (field === 'status') {
    return normalizeStatusValue(value)
  }

  return value
}

function pushChange(changes: ChangeItem[], field: string, from: any, to: any) {
  const safeFrom = normalizeChangeValue(field, from)
  const safeTo = normalizeChangeValue(field, to)

  if (asText(safeFrom) !== asText(safeTo)) {
    changes.push({ field, from: safeFrom, to: safeTo })
  }
}

async function getEventById(req: any, id: string | number) {
  return req.payload
    .findByID({
      collection: 'calendar-events',
      id,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)
}

async function getChildById(req: any, id: string | number) {
  return req.payload
    .findByID({
      collection: 'children',
      id,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)
}

async function getChildSnapshot(req: any, childValue: any) {
  const childId = getRelId(childValue)

  if (!childId) {
    return {
      childId: null,
      childName: '',
    }
  }

  const child = await getChildById(req, childId)

  return {
    childId,
    childName: child?.fullName || child?.name || '',
  }
}

async function validateChildBelongsToFamily(req: any, childValue: any, familyId: any) {
  const childId = getRelId(childValue)

  if (!childId) {
    throw new Error('Missing child')
  }

  const child = await getChildById(req, childId)
  if (!child) {
    throw new Error('Child not found')
  }

  const childFamilyId = getFamilyIdFromDoc(child)

  if (!childFamilyId || String(childFamilyId) !== String(familyId)) {
    throw new Error('Child does not belong to your family.')
  }

  return child
}

async function canAccessEventByFamily(req: any, id: string | number) {
  if (!req?.user) return false
  if (isAdmin(req)) return true

  const familyId = getFamilyIdFromUser(req)
  if (!familyId) return false

  const eventDoc = await getEventById(req, id)
  if (!eventDoc) return false

  const docFamilyId = getFamilyIdFromDoc(eventDoc)
  if (!docFamilyId) return false

  return String(docFamilyId) === String(familyId)
}

function buildEventMeta(doc: any, childName?: string, previousDoc?: any) {
  return {
    title: doc?.title || '',
    childName: childName || '',
    startAt: doc?.startAt || undefined,
    endAt: doc?.endAt || undefined,
    status: normalizeStatusValue(doc?.status),
    previousStatus: previousDoc?.status
      ? normalizeStatusValue(previousDoc?.status)
      : undefined,
    allDay: !!doc?.allDay,
    notes: doc?.notes || '',
  }
}

export const CalendarEvents: CollectionConfig = {
  slug: 'calendar-events',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'child', 'status', 'startAt', 'endAt'],
  },

  access: {
    create: ({ req }) => !!req.user && (isAdmin(req) || isCustomer(req)),

    read: ({ req }) => {
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

    update: async ({ req, id }) => {
      if (!id) return false
      return canAccessEventByFamily(req, id)
    },

    delete: async ({ req, id }) => {
      if (!id) return false
      return canAccessEventByFamily(req, id)
    },
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation, originalDoc }: any) => {
        const next: any = { ...(data ?? {}) }

        if (next.title) next.title = String(next.title).trim()
        if (next.notes) next.notes = String(next.notes).trim()

        if (!req?.user) return next

        const familyId = getFamilyIdFromUser(req)
        const userId = getRelId(req.user?.id)

        if (operation === 'create') {
          if (!familyId) {
            throw new Error('Your account is not linked to a family.')
          }

          await validateChildBelongsToFamily(req, next.child, familyId)

          return {
            ...next,
            family: next.family ?? familyId,
            createdBy:
              next.createdBy ??
              (userId
                ? {
                    relationTo: getActorRelation(req),
                    value: userId,
                  }
                : undefined),
          }
        }

        if (operation === 'update') {
          const currentFamilyId = getFamilyIdFromDoc(originalDoc) ?? familyId

          if (!currentFamilyId) {
            throw new Error('Event has no family assigned.')
          }

          const nextChild = next.child ?? originalDoc?.child
          await validateChildBelongsToFamily(req, nextChild, currentFamilyId)

          return {
            ...next,
            family: originalDoc?.family ?? currentFamilyId,
            createdBy: originalDoc?.createdBy,
          }
        }

        return next
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getFamilyIdFromDoc(doc)
        const actorUserId = getRelId(req?.user?.id)
        const currentChild = await getChildSnapshot(req, doc?.child)

        if (operation === 'create') {
          const meta = buildEventMeta(doc, currentChild.childName)

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
            meta,
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
              ...meta,
            },
          })

          return
        }

        if (operation === 'update') {
          const changes: ChangeItem[] = []

          pushChange(changes, 'title', previousDoc?.title, doc?.title)
          pushChange(changes, 'child', getRelId(previousDoc?.child), getRelId(doc?.child))
          pushChange(changes, 'status', previousDoc?.status, doc?.status)
          pushChange(changes, 'startAt', previousDoc?.startAt, doc?.startAt)
          pushChange(changes, 'endAt', previousDoc?.endAt, doc?.endAt)
          pushChange(changes, 'notes', previousDoc?.notes, doc?.notes)
          pushChange(changes, 'allDay', !!previousDoc?.allDay, !!doc?.allDay)

          if (!changes.length) return

          const meta = buildEventMeta(doc, currentChild.childName, previousDoc)

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
            meta,
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
              ...meta,
            },
          })

          return
        }
      },
    ],

    afterDelete: [
      async ({ doc, req }: any) => {
        if (!req?.user || !doc) return

        const actorUserId = getRelId(req?.user?.id)
        const familyId = getFamilyIdFromDoc(doc)
        const childSnapshot = await getChildSnapshot(req, doc?.child)
        const meta = buildEventMeta(doc, childSnapshot.childName)

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
          meta,
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
            ...meta,
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
      relationTo: ['customers', 'users'],
    },
  ],
}