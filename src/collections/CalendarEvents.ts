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

function getActorName(req: any) {
  const u: any = req?.user
  if (!u) return 'A parent'

  const full = `${String(u?.firstName || '').trim()} ${String(u?.lastName || '').trim()}`.trim()
  return full || u?.fullName || u?.name || u?.email || 'A parent'
}

function getPersonName(value: any) {
  if (!value || typeof value !== 'object') return ''

  const full =
    `${String(value?.firstName || '').trim()} ${String(value?.lastName || '').trim()}`.trim()

  return value?.fullName || value?.name || full || value?.email || ''
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

function setDeleteSnapshot(req: any, snapshot: any) {
  req.context = req.context || {}
  req.context.calendarDeleteSnapshot = snapshot
}

function getDeleteSnapshot(req: any) {
  return req?.context?.calendarDeleteSnapshot || null
}

function isSilentCalendarDoc(doc: any, req?: any) {
  if (req?.context?.__skipCalendarAuditNotify) return true
  if (req?.context?.__skipCalendarToEconomyCascade) return true

  if (doc?.silentSync === true) return true
  if (doc?.linkedEconomyTransaction) return true

  const source = String(doc?.source || '').trim()
  if (source === 'economy-transaction') return true
  if (source === 'economy-request') return true
  if (source === 'system') return true

  const eventType = String(doc?.eventType || '').trim()
  if (eventType === 'payment') return true

  return false
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

  const childFull =
    `${String((child as any)?.firstName || '').trim()} ${String((child as any)?.lastName || '').trim()}`.trim()

  return {
    childId,
    childName: child?.fullName || child?.name || childFull || '',
  }
}

async function getCustomerDisplayName(req: any, value: any) {
  const id = getRelId(value)
  if (!id) return ''

  if (typeof value === 'object' && value) {
    const embeddedName = getPersonName(value)
    if (embeddedName) return embeddedName
    if (value.email) return value.email
  }

  const customer = await req.payload
    .findByID({
      collection: 'customers',
      id,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)

  if (!customer) return ''

  const customerFull =
    `${String((customer as any)?.firstName || '').trim()} ${String((customer as any)?.lastName || '').trim()}`.trim()

  return customer?.fullName || customer?.name || customerFull || customer?.email || ''
}

function toEventType(value: any) {
  const allowed = [
    'handover',
    'pickup',
    'dropoff',
    'school',
    'activity',
    'medical',
    'payment',
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

function toHandoverStatus(value: any) {
  const allowed = ['not-started', 'delivered', 'completed']
  return allowed.includes(value) ? value : 'not-started'
}

function isConfirmationDecision(value: any) {
  return value === 'confirmed' || value === 'declined'
}

function hasEventStarted(value: any) {
  if (!value) return false
  const time = new Date(value).getTime()
  return !Number.isNaN(time) && time <= Date.now()
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
      'handoverStatus',
      'source',
      'silentSync',
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
        const effectiveHandoverStatus = toHandoverStatus(mergedData.handoverStatus)

        nextData.eventType = effectiveEventType
        nextData.priority = effectivePriority
        nextData.source = mergedData?.source || originalDoc?.source || 'manual'
        nextData.silentSync = Boolean(mergedData?.silentSync ?? originalDoc?.silentSync ?? false)

        if (effectiveEventType !== 'handover') {
          nextData.handoverFrom = null
          nextData.handoverTo = null
          nextData.handoverStatus = 'not-started'
          nextData.handoverDeliveredAt = null
          nextData.handoverDeliveredBy = null
          nextData.handoverReceivedAt = null
          nextData.handoverReceivedBy = null
        } else {
          nextData.handoverStatus = effectiveHandoverStatus
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
          if (!effectiveConfirmationStatus || effectiveConfirmationStatus === 'not-required') {
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

        const previousHandoverStatus = originalDoc?.handoverStatus || 'not-started'
        const nextHandoverStatus = mergedData?.handoverStatus || 'not-started'

        if (previousHandoverStatus !== nextHandoverStatus) {
          if (!userId) {
            throw new Error('You must be logged in to update handover status.')
          }

          if (effectiveEventType !== 'handover') {
            throw new Error('Only handover events can update handover status.')
          }

          if (!hasEventStarted(mergedData.startAt)) {
            throw new Error('Handover can only be confirmed after the handover time has started.')
          }

          const handoverFromId = getRelId(mergedData.handoverFrom)
          const handoverToId = getRelId(mergedData.handoverTo)

          if (nextHandoverStatus === 'delivered') {
            if (String(handoverFromId) !== String(userId)) {
              throw new Error('Only the parent handing over the child can confirm delivery.')
            }

            nextData.handoverStatus = 'delivered'
            nextData.handoverDeliveredAt = new Date().toISOString()
            nextData.handoverDeliveredBy = userId
          }

          if (nextHandoverStatus === 'completed') {
            if (previousHandoverStatus !== 'delivered') {
              throw new Error('The child must be marked as delivered before it can be received.')
            }

            if (String(handoverToId) !== String(userId)) {
              throw new Error('Only the receiving parent can confirm receipt.')
            }

            nextData.handoverStatus = 'completed'
            nextData.handoverReceivedAt = new Date().toISOString()
            nextData.handoverReceivedBy = userId
          }
        }

        return nextData
      },
    ],

    beforeDelete: [
      async ({ req, id }: any) => {
        if (!id) return

        const doc = await req.payload
          .findByID({
            collection: 'calendar-events',
            id,
            overrideAccess: true,
            depth: 1,
          })
          .catch(() => null)

        if (!doc) return
        setDeleteSnapshot(req, doc)
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return
        if (isSilentCalendarDoc(doc, req)) return

        const familyId = getRelId(doc?.family)
        const actorUserId = getRelId(req?.user?.id)
        const actorName = getActorName(req)
        const currentChild = await getChildSnapshot(req, doc?.child)

        const handoverFromName = await getCustomerDisplayName(req, doc?.handoverFrom)
        const handoverToName = await getCustomerDisplayName(req, doc?.handoverTo)
        const responsibleParentName = await getCustomerDisplayName(req, doc?.responsibleParent)
        const confirmedByName = await getCustomerDisplayName(req, doc?.confirmedBy)

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
            meta: {
              title: doc?.title,
              eventType: doc?.eventType,
              confirmationStatus: doc?.confirmationStatus,
              requiresConfirmation: !!doc?.requiresConfirmation,
              handoverStatus: doc?.handoverStatus,
              startAt: doc?.startAt,
              endAt: doc?.endAt,
              location: doc?.location || '',
              handoverFromName,
              handoverToName,
              responsibleParentName,
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId: currentChild.childId,
            type: 'calendar',
            event: 'created',
            title: 'New calendar event',
            message: `${doc?.title || 'An event'} was added`,
            link: `/calendar?event=${doc?.id}`,
            meta: {
              actorName,
              eventId: doc?.id,
              title: doc?.title,
              childName: currentChild.childName,
              eventType: doc?.eventType,
              confirmationStatus: doc?.confirmationStatus,
              requiresConfirmation: !!doc?.requiresConfirmation,
              handoverStatus: doc?.handoverStatus,
              startAt: doc?.startAt,
              endAt: doc?.endAt,
              location: doc?.location || '',
              handoverFromName,
              handoverToName,
              responsibleParentName,
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
          pushChange(changes, 'handoverStatus', previousDoc?.handoverStatus, doc?.handoverStatus)
          pushChange(
            changes,
            'handoverDeliveredAt',
            previousDoc?.handoverDeliveredAt,
            doc?.handoverDeliveredAt,
          )
          pushChange(
            changes,
            'handoverDeliveredBy',
            getRelId(previousDoc?.handoverDeliveredBy),
            getRelId(doc?.handoverDeliveredBy),
          )
          pushChange(
            changes,
            'handoverReceivedAt',
            previousDoc?.handoverReceivedAt,
            doc?.handoverReceivedAt,
          )
          pushChange(
            changes,
            'handoverReceivedBy',
            getRelId(previousDoc?.handoverReceivedBy),
            getRelId(doc?.handoverReceivedBy),
          )

          if (!changes.length) return

          const previousHandoverStatus = previousDoc?.handoverStatus || 'not-started'
          const currentHandoverStatus = doc?.handoverStatus || 'not-started'
          const handoverStatusChanged = previousHandoverStatus !== currentHandoverStatus

          if (handoverStatusChanged && currentHandoverStatus === 'delivered') {
            await logAudit(req, {
              familyId,
              childId: currentChild.childId,
              childName: currentChild.childName,
              action: 'event.handover.delivered',
              entityType: 'event',
              entityId: String(doc?.id),
              scope: 'calendar',
              severity: 'info',
              relatedToRole: 'both',
              summary: 'Child handover marked as delivered',
              targetLabel: doc?.title,
              changes,
              meta: {
                title: doc?.title,
                handoverStatus: doc?.handoverStatus,
                handoverDeliveredAt: doc?.handoverDeliveredAt,
                handoverDeliveredBy: getRelId(doc?.handoverDeliveredBy),
                handoverFromName,
                handoverToName,
                responsibleParentName,
              },
            })

            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId: currentChild.childId,
              type: 'calendar',
              event: 'updated',
              title: 'Child handover delivered',
              message: `${doc?.title || 'A handover'} was marked as delivered`,
              link: `/calendar?event=${doc?.id}`,
              meta: {
                actorName,
                eventId: doc?.id,
                title: doc?.title,
                childName: currentChild.childName,
                eventType: doc?.eventType,
                handoverStatus: doc?.handoverStatus,
                handoverDeliveredAt: doc?.handoverDeliveredAt,
                handoverFromName,
                handoverToName,
                responsibleParentName,
                startAt: doc?.startAt,
                endAt: doc?.endAt,
                location: doc?.location || '',
              },
            })

            return
          }

          if (handoverStatusChanged && currentHandoverStatus === 'completed') {
            await logAudit(req, {
              familyId,
              childId: currentChild.childId,
              childName: currentChild.childName,
              action: 'event.handover.completed',
              entityType: 'event',
              entityId: String(doc?.id),
              scope: 'calendar',
              severity: 'info',
              relatedToRole: 'both',
              summary: 'Child handover marked as received and completed',
              targetLabel: doc?.title,
              changes,
              meta: {
                title: doc?.title,
                handoverStatus: doc?.handoverStatus,
                handoverReceivedAt: doc?.handoverReceivedAt,
                handoverReceivedBy: getRelId(doc?.handoverReceivedBy),
                handoverFromName,
                handoverToName,
                responsibleParentName,
              },
            })

            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId: currentChild.childId,
              type: 'calendar',
              event: 'updated',
              title: 'Child handover completed',
              message: `${doc?.title || 'A handover'} was marked as received`,
              link: `/calendar?event=${doc?.id}`,
              meta: {
                actorName,
                eventId: doc?.id,
                title: doc?.title,
                childName: currentChild.childName,
                eventType: doc?.eventType,
                handoverStatus: doc?.handoverStatus,
                handoverReceivedAt: doc?.handoverReceivedAt,
                handoverFromName,
                handoverToName,
                responsibleParentName,
                startAt: doc?.startAt,
                endAt: doc?.endAt,
                location: doc?.location || '',
              },
            })

            return
          }

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
            meta: {
              title: doc?.title,
              eventType: doc?.eventType,
              confirmationStatus: doc?.confirmationStatus,
              requiresConfirmation: !!doc?.requiresConfirmation,
              handoverStatus: doc?.handoverStatus,
              startAt: doc?.startAt,
              endAt: doc?.endAt,
              location: doc?.location || '',
            },
          })

          const previousConfirmation = previousDoc?.confirmationStatus
          const currentConfirmation = doc?.confirmationStatus
          const confirmationChanged = previousConfirmation !== currentConfirmation

          if (confirmationChanged && currentConfirmation === 'confirmed') {
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
              meta: {
                title: doc?.title,
                confirmedBy: getRelId(doc?.confirmedBy),
                confirmedByName,
                confirmedAt: doc?.confirmedAt,
              },
            })

            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId: currentChild.childId,
              type: 'calendar',
              event: 'confirmed',
              title: 'Calendar event confirmed',
              message: `${doc?.title || 'An event'} was accepted`,
              link: `/calendar?event=${doc?.id}`,
              meta: {
                actorName,
                eventId: doc?.id,
                title: doc?.title,
                childName: currentChild.childName,
                eventType: doc?.eventType,
                confirmationStatus: doc?.confirmationStatus,
                requiresConfirmation: !!doc?.requiresConfirmation,
                confirmedBy: getRelId(doc?.confirmedBy),
                confirmedByName,
                confirmedAt: doc?.confirmedAt,
                startAt: doc?.startAt,
                endAt: doc?.endAt,
                location: doc?.location || '',
                handoverFromName,
                handoverToName,
                responsibleParentName,
              },
            })

            return
          }

          if (confirmationChanged && currentConfirmation === 'declined') {
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
              meta: {
                title: doc?.title,
                confirmedBy: getRelId(doc?.confirmedBy),
                confirmedByName,
                confirmedAt: doc?.confirmedAt,
              },
            })

            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId: currentChild.childId,
              type: 'calendar',
              event: 'declined',
              title: 'Calendar event declined',
              message: `${doc?.title || 'An event'} was declined`,
              link: `/calendar?event=${doc?.id}`,
              meta: {
                actorName,
                eventId: doc?.id,
                title: doc?.title,
                childName: currentChild.childName,
                eventType: doc?.eventType,
                confirmationStatus: doc?.confirmationStatus,
                requiresConfirmation: !!doc?.requiresConfirmation,
                confirmedBy: getRelId(doc?.confirmedBy),
                confirmedByName,
                confirmedAt: doc?.confirmedAt,
                startAt: doc?.startAt,
                endAt: doc?.endAt,
                location: doc?.location || '',
                handoverFromName,
                handoverToName,
                responsibleParentName,
              },
            })

            return
          }

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId: currentChild.childId,
            type: 'calendar',
            event: 'updated',
            title: 'Calendar event updated',
            message: `${doc?.title || 'An event'} was updated`,
            link: `/calendar?event=${doc?.id}`,
            meta: {
              actorName,
              eventId: doc?.id,
              title: doc?.title,
              childName: currentChild.childName,
              eventType: doc?.eventType,
              confirmationStatus: doc?.confirmationStatus,
              requiresConfirmation: !!doc?.requiresConfirmation,
              handoverStatus: doc?.handoverStatus,
              startAt: doc?.startAt,
              endAt: doc?.endAt,
              location: doc?.location || '',
              handoverFromName,
              handoverToName,
              responsibleParentName,
            },
          })
        }
      },
    ],

    afterDelete: [
      async ({ req, id }: any) => {
        if (!req?.user || !id) return

        const deletedDoc = getDeleteSnapshot(req)
        if (!deletedDoc) return
        if (isSilentCalendarDoc(deletedDoc, req)) return

        const familyId = getRelId(deletedDoc?.family)
        const actorUserId = getRelId(req?.user?.id)
        const actorName = getActorName(req)
        const currentChild = await getChildSnapshot(req, deletedDoc?.child)

        const handoverFromName = await getCustomerDisplayName(req, deletedDoc?.handoverFrom)
        const handoverToName = await getCustomerDisplayName(req, deletedDoc?.handoverTo)
        const responsibleParentName = await getCustomerDisplayName(
          req,
          deletedDoc?.responsibleParent,
        )

        await logAudit(req, {
          familyId,
          childId: currentChild.childId,
          childName: currentChild.childName,
          action: 'event.delete',
          entityType: 'event',
          entityId: String(id),
          scope: 'calendar',
          severity: 'important',
          relatedToRole: 'both',
          summary: 'Deleted calendar event',
          targetLabel: deletedDoc?.title,
          meta: {
            title: deletedDoc?.title,
            eventType: deletedDoc?.eventType,
            confirmationStatus: deletedDoc?.confirmationStatus,
            requiresConfirmation: !!deletedDoc?.requiresConfirmation,
            handoverStatus: deletedDoc?.handoverStatus,
            startAt: deletedDoc?.startAt,
            endAt: deletedDoc?.endAt,
            location: deletedDoc?.location || '',
            handoverFromName,
            handoverToName,
            responsibleParentName,
          },
        })

        await notifyFamily(req, {
          familyId,
          actorUserId,
          childId: currentChild.childId,
          type: 'calendar',
          event: 'deleted',
          title: 'Calendar event deleted',
          message: `${deletedDoc?.title || 'An event'} was deleted`,
          link: '/calendar',
          meta: {
            actorName,
            eventId: id,
            title: deletedDoc?.title,
            childName: currentChild.childName,
            eventType: deletedDoc?.eventType,
            confirmationStatus: deletedDoc?.confirmationStatus,
            requiresConfirmation: !!deletedDoc?.requiresConfirmation,
            handoverStatus: deletedDoc?.handoverStatus,
            startAt: deletedDoc?.startAt,
            endAt: deletedDoc?.endAt,
            location: deletedDoc?.location || '',
            handoverFromName,
            handoverToName,
            responsibleParentName,
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
        { label: 'Payment', value: 'payment' },
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
      name: 'handoverStatus',
      type: 'select',
      defaultValue: 'not-started',
      options: [
        { label: 'Not started', value: 'not-started' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'handoverDeliveredAt',
      type: 'date',
    },
    {
      name: 'handoverDeliveredBy',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'handoverReceivedAt',
      type: 'date',
    },
    {
      name: 'handoverReceivedBy',
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
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Economy transaction', value: 'economy-transaction' },
        { label: 'Economy request', value: 'economy-request' },
        { label: 'System', value: 'system' },
      ],
      index: true,
    },
    {
      name: 'silentSync',
      type: 'checkbox',
      defaultValue: false,
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