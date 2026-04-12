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

function toEventType(value: any) {
  const allowed = [
    'handover',
    'pickup',
    'dropoff',
    'school',
    'activity',
    'medical',
    'expense-related',
    'other',
  ]
  return allowed.includes(value) ? value : 'other'
}

function toPriority(value: any) {
  const allowed = ['normal', 'important', 'urgent']
  return allowed.includes(value) ? value : 'normal'
}

function toConfirmationStatus(value: any) {
  const allowed = ['not-required', 'pending', 'confirmed', 'declined']
  return allowed.includes(value) ? value : 'not-required'
}

function isConfirmationDecision(value: any) {
  return value === 'confirmed' || value === 'declined'
}

export const CalendarEvents: CollectionConfig = {
  slug: 'calendar-events',

  admin: {
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'eventType',
      'priority',
      'confirmationStatus',
      'startAt',
      'endAt',
    ],
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
      async ({ data, req, operation, originalDoc }) => {
        const familyId = getFamilyIdFromUser(req)
        const userId = getRelId((req.user as any)?.id)

        if (!familyId) return data

        const mergedData = {
          ...(originalDoc ?? {}),
          ...(data ?? {}),
        } as any

        const childId = mergedData?.child
        if (childId) {
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
        }

        const nextData = {
          ...(data ?? {}),
          family: (data as any)?.family ?? originalDoc?.family ?? familyId,
        } as any

        if (operation === 'create' && userId) {
          nextData.createdBy = nextData.createdBy ?? userId
        }

        const effectiveEventType = toEventType(mergedData.eventType)
        const effectivePriority = toPriority(mergedData.priority)
        const effectiveRequiresConfirmation = Boolean(mergedData.requiresConfirmation)
        const effectiveConfirmationStatus = toConfirmationStatus(mergedData.confirmationStatus)

        nextData.eventType = effectiveEventType
        nextData.priority = effectivePriority

        if (effectiveEventType !== 'handover') {
          nextData.handoverFrom = (data as any)?.handoverFrom ?? null
          nextData.handoverTo = (data as any)?.handoverTo ?? null
        }

        const previousConfirmationStatus = originalDoc?.confirmationStatus
        const nextConfirmationStatus = mergedData?.confirmationStatus
        const createdById = getRelId(originalDoc?.createdBy)

        const isTryingToDecideConfirmation =
          previousConfirmationStatus !== nextConfirmationStatus &&
          isConfirmationDecision(nextConfirmationStatus)

        if (isTryingToDecideConfirmation) {
          if (!userId) {
            throw new Error('You must be logged in to confirm this event.')
          }

          if (String(createdById) === String(userId)) {
            throw new Error('The creator of the event cannot confirm or decline it.')
          }
        }

        if (!effectiveRequiresConfirmation) {
          nextData.confirmationStatus = 'not-required'
          nextData.confirmedAt = null
          nextData.confirmedBy = null
        } else {
          if (
            !effectiveConfirmationStatus ||
            effectiveConfirmationStatus === 'not-required'
          ) {
            nextData.confirmationStatus = 'pending'
            nextData.confirmedAt = null
            nextData.confirmedBy = null
          } else if (
            effectiveConfirmationStatus === 'confirmed' ||
            effectiveConfirmationStatus === 'declined'
          ) {
            nextData.confirmationStatus = effectiveConfirmationStatus
            nextData.confirmedAt =
              (data as any)?.confirmedAt ??
              originalDoc?.confirmedAt ??
              new Date().toISOString()

            if (isCustomer(req) && userId) {
              nextData.confirmedBy =
                (data as any)?.confirmedBy ?? originalDoc?.confirmedBy ?? userId
            }
          } else if (effectiveConfirmationStatus === 'pending') {
            nextData.confirmationStatus = 'pending'
            nextData.confirmedAt = null
            nextData.confirmedBy = null
          }
        }

        return nextData
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getRelId(doc?.family)
        const actorUserId = getRelId(req?.user?.id)
        const currentChild = await getChildSnapshot(req, doc?.child)

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId: currentChild.childId,
            childName: currentChild.childName,
            action: 'event.create',
            entityType: 'event',
            entityId: String(doc?.id),
            scope: 'calendar',
            severity: doc?.priority === 'urgent' ? 'important' : 'info',
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
              eventType: doc?.eventType,
              confirmationStatus: doc?.confirmationStatus,
            },
          })

          return
        }

        if (operation === 'update') {
          const changes: Array<{ field: string; from?: any; to?: any }> = []

          pushChange(changes, 'title', previousDoc?.title, doc?.title)
          pushChange(changes, 'child', getRelId(previousDoc?.child), getRelId(doc?.child))
          pushChange(changes, 'eventType', previousDoc?.eventType, doc?.eventType)
          pushChange(changes, 'priority', previousDoc?.priority, doc?.priority)
          pushChange(changes, 'location', previousDoc?.location, doc?.location)
          pushChange(
            changes,
            'requiresConfirmation',
            !!previousDoc?.requiresConfirmation,
            !!doc?.requiresConfirmation,
          )
          pushChange(
            changes,
            'confirmationStatus',
            previousDoc?.confirmationStatus,
            doc?.confirmationStatus,
          )
          pushChange(changes, 'startAt', previousDoc?.startAt, doc?.startAt)
          pushChange(changes, 'endAt', previousDoc?.endAt, doc?.endAt)
          pushChange(changes, 'notes', previousDoc?.notes, doc?.notes)
          pushChange(changes, 'allDay', !!previousDoc?.allDay, !!doc?.allDay)
          pushChange(
            changes,
            'handoverFrom',
            getRelId(previousDoc?.handoverFrom),
            getRelId(doc?.handoverFrom),
          )
          pushChange(
            changes,
            'handoverTo',
            getRelId(previousDoc?.handoverTo),
            getRelId(doc?.handoverTo),
          )
          pushChange(
            changes,
            'responsibleParent',
            getRelId(previousDoc?.responsibleParent),
            getRelId(doc?.responsibleParent),
          )
          pushChange(changes, 'confirmedAt', previousDoc?.confirmedAt, doc?.confirmedAt)
          pushChange(
            changes,
            'confirmedBy',
            getRelId(previousDoc?.confirmedBy),
            getRelId(doc?.confirmedBy),
          )

          if (!changes.length) return

          await logAudit(req, {
            familyId,
            childId: currentChild.childId,
            childName: currentChild.childName,
            action: 'event.update',
            entityType: 'event',
            entityId: String(doc?.id),
            scope: 'calendar',
            severity: doc?.priority === 'urgent' ? 'important' : 'info',
            relatedToRole: 'both',
            summary: 'Updated calendar event',
            targetLabel: doc?.title,
            changes,
          })

          const previousConfirmation = previousDoc?.confirmationStatus
          const currentConfirmation = doc?.confirmationStatus

          if (previousConfirmation !== currentConfirmation) {
            if (currentConfirmation === 'confirmed') {
              await logAudit(req, {
                familyId,
                childId: currentChild.childId,
                childName: currentChild.childName,
                action: 'event.confirmed',
                entityType: 'event',
                entityId: String(doc?.id),
                scope: 'calendar',
                severity: 'info',
                relatedToRole: 'both',
                summary: 'Confirmed calendar event',
                targetLabel: doc?.title,
              })
            }

            if (currentConfirmation === 'declined') {
              await logAudit(req, {
                familyId,
                childId: currentChild.childId,
                childName: currentChild.childName,
                action: 'event.declined',
                entityType: 'event',
                entityId: String(doc?.id),
                scope: 'calendar',
                severity: 'important',
                relatedToRole: 'both',
                summary: 'Declined calendar event',
                targetLabel: doc?.title,
              })
            }
          }

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
              eventType: doc?.eventType,
              confirmationStatus: doc?.confirmationStatus,
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
      required: false,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'Handover', value: 'handover' },
        { label: 'Pickup', value: 'pickup' },
        { label: 'Drop-off', value: 'dropoff' },
        { label: 'School', value: 'school' },
        { label: 'Activity', value: 'activity' },
        { label: 'Medical', value: 'medical' },
        { label: 'Expense related', value: 'expense-related' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'priority',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Important', value: 'important' },
        { label: 'Urgent', value: 'urgent' },
      ],
    },
    {
      name: 'location',
      type: 'text',
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'requiresConfirmation',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'confirmationStatus',
      type: 'select',
      defaultValue: 'not-required',
      options: [
        { label: 'Not required', value: 'not-required' },
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Declined', value: 'declined' },
      ],
    },
    {
      name: 'confirmedAt',
      type: 'date',
    },
    {
      name: 'confirmedBy',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'handoverFrom',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'handoverTo',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'responsibleParent',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'linkedEconomyTransaction',
      type: 'relationship',
      relationTo: 'economy-transactions',
      required: false,
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