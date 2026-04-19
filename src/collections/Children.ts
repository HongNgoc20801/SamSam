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

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return typeof u.family === 'string' ? u.family : u.family?.id ?? null
}

function getFamilyIdFromDoc(doc: any) {
  return typeof doc?.family === 'string' ? doc.family : doc?.family?.id ?? null
}

function getRelId(v: any) {
  if (v == null) return null
  if (typeof v === 'string' || typeof v === 'number') return v
  return v?.id ?? null
}

function cleanPhone(v: any) {
  if (!v) return ''
  return String(v).trim()
}

function stableJson(v: any) {
  return JSON.stringify(v ?? null)
}

function pick(obj: any, keys: string[]) {
  const out: any = {}
  for (const k of keys) out[k] = obj?.[k]
  return out
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

function getActorDisplayName(req: any) {
  const u: any = req?.user
  if (!u) return 'A parent'

  const firstName = String(u.firstName || u.fornavn || '').trim()
  if (firstName) return firstName

  const combined =
    `${String(u.firstName || u.fornavn || '').trim()} ${String(
      u.lastName || u.etternavn || '',
    ).trim()}`.trim()
  if (combined) return combined

  const fullName = String(u.fullName || u.name || '').trim()
  if (fullName) return fullName

  const email = String(u.email || '').trim()
  if (email) return email

  return 'A parent'
}

const IMPORTANT_FIELDS = [
  'fullName',
  'birthDate',
  'gender',
  'nationalId',
  'avatar',
  'medical',
  'school',
  'emergencyContacts',
] as const

export const Children: CollectionConfig = {
  slug: 'children',

  admin: {
    useAsTitle: 'fullName',
  },

  access: {
    create: ({ req }) => !!req.user && (isAdmin(req) || isCustomer(req)),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return { family: { equals: familyId } }
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return { family: { equals: familyId } }
    },

    delete: ({ req }) => !!req.user && isAdmin(req),
  },

  hooks: {
    beforeChange: [
      async (args: any) => {
        const { data, req, operation } = args
        const originalDoc = args?.originalDoc ?? args?.previousDoc ?? args?.doc ?? null

        const next: any = { ...(data ?? {}) }

        if (next.fullName) next.fullName = String(next.fullName).trim()
        if (next.nationalId) next.nationalId = String(next.nationalId).replace(/\s+/g, '')

        if (Array.isArray(next?.emergencyContacts)) {
          next.emergencyContacts = next.emergencyContacts
            .map((c: any) => {
              const phones = Array.isArray(c?.phones)
                ? c.phones
                    .map((p: any) => ({ value: cleanPhone(p?.value) }))
                    .filter((p: any) => p.value)
                : []

              return {
                ...c,
                name: String(c?.name ?? '').trim(),
                relation: c?.relation ?? undefined,
                isPrimary: !!c?.isPrimary,
                phones,
              }
            })
            .filter((c: any) => c.name && c.phones?.length)
        }

        if (Array.isArray(next?.emergencyContacts) && next.emergencyContacts.length) {
          const hasPrimary = next.emergencyContacts.some((c: any) => c.isPrimary)
          if (!hasPrimary) next.emergencyContacts[0].isPrimary = true

          let found = false
          next.emergencyContacts = next.emergencyContacts.map((c: any) => {
            if (!c.isPrimary) return c
            if (!found) {
              found = true
              return c
            }
            return { ...c, isPrimary: false }
          })
        }

        if (next?.medical) {
          if (Array.isArray(next.medical.allergies)) {
            next.medical.allergies = next.medical.allergies
              .map((x: any) => ({ value: String(x?.value ?? '').trim() }))
              .filter((x: any) => x.value)
          }

          if (Array.isArray(next.medical.conditions)) {
            next.medical.conditions = next.medical.conditions
              .map((x: any) => ({ value: String(x?.value ?? '').trim() }))
              .filter((x: any) => x.value)
          }

          if (next.medical.notesShort) {
            next.medical.notesShort = String(next.medical.notesShort).slice(0, 160)
          }

          if (next.medical.gp) {
            if (next.medical.gp.name) {
              next.medical.gp.name = String(next.medical.gp.name).trim()
            }

            if (next.medical.gp.clinic) {
              next.medical.gp.clinic = String(next.medical.gp.clinic).trim()
            }

            if (Array.isArray(next.medical.gp.phones)) {
              next.medical.gp.phones = next.medical.gp.phones
                .map((p: any) => ({ value: cleanPhone(p?.value) }))
                .filter((p: any) => p.value)
            }
          }
        }

        if (next?.school) {
          if (next.school.schoolName) {
            next.school.schoolName = String(next.school.schoolName).trim()
          }
          if (next.school.className) {
            next.school.className = String(next.school.className).trim()
          }
          if (next.school.mainTeacher) {
            next.school.mainTeacher = String(next.school.mainTeacher).trim()
          }
        }

        if (operation === 'create') {
          const familyId = getFamilyIdFromUser(req)
          const userId = (req.user as any)?.id

          if (!next.family && !familyId) {
            throw new Error(
              'Your account is not in a family group yet. Please create/join a family before creating a child profile.',
            )
          }

          return {
            ...next,
            family: next.family ?? familyId,
            createdBy: next.createdBy ?? userId,
            lastEditedBy: userId,
            status: next.status ?? 'pending',
            confirmedBy: null,
            confirmedAt: null,
          }
        }

        if (operation === 'update') {
          const userId = (req.user as any)?.id

          const wantsConfirm = next?.status === 'confirmed'
          const wasPending = originalDoc?.status === 'pending'
          const wasConfirmed = originalDoc?.status === 'confirmed'

          const merged = { ...(originalDoc ?? {}), ...(next ?? {}) }
          const prevKey = stableJson(pick(originalDoc, IMPORTANT_FIELDS as any))
          const nextKey = stableJson(pick(merged, IMPORTANT_FIELDS as any))
          const importantFieldsChanged = prevKey !== nextKey

          if (wantsConfirm && wasPending) {
            const lastEditedById =
              typeof originalDoc?.lastEditedBy === 'string'
                ? originalDoc.lastEditedBy
                : originalDoc?.lastEditedBy?.id

            if (lastEditedById && lastEditedById === userId) {
              throw new Error(
                'You cannot confirm a child profile that you last edited. The other parent must confirm it.',
              )
            }

            next.status = 'confirmed'
            next.confirmedBy = userId
            next.confirmedAt = new Date().toISOString()

            if ('lastEditedBy' in next) {
              delete next.lastEditedBy
            }

            return next
          }

          if (wasConfirmed && importantFieldsChanged) {
            next.status = 'pending'
            next.confirmedBy = null
            next.confirmedAt = null
          }

          if (importantFieldsChanged) {
            next.lastEditedBy = userId
          }

          if ('confirmedBy' in next || 'confirmedAt' in next) {
            if (!(next.status === 'confirmed' && originalDoc?.status === 'pending')) {
              delete next.confirmedBy
              delete next.confirmedAt
            }
          }

          return next
        }

        return next
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const childId = doc?.id ?? null
        const familyId = getFamilyIdFromDoc(doc)
        const actorUserId = getRelId(req?.user?.id)
        const actorName = getActorDisplayName(req)

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId,
            childName: doc?.fullName,
            action: 'child.create',
            entityType: 'child',
            entityId: String(doc?.id),
            scope: 'child_profile',
            severity: 'important',
            summary: `${actorName} created child profile for ${doc?.fullName || 'this child'}`,
            meta: {
              actorName,
              childName: doc?.fullName,
              status: doc?.status,
              needsConfirmation: doc?.status === 'pending',
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'status',
            event: 'created',
            title: `New child profile: ${doc?.fullName || 'Child profile'}`,
            message: `${actorName} created this child profile. Waiting for second parent confirmation.`,
            link: `/child-info/${doc?.id}`,
            meta: {
              actorName,
              childName: doc?.fullName,
              status: doc?.status,
              eventType: 'child-profile',
              needsConfirmation: doc?.status === 'pending',
            },
          })

          return
        }

        if (operation === 'update') {
          const prevStatus = previousDoc?.status
          const nextStatus = doc?.status
          const isConfirm = prevStatus === 'pending' && nextStatus === 'confirmed'

          if (isConfirm) {
            await logAudit(req, {
              familyId,
              childId,
              childName: doc?.fullName,
              action: 'child.confirm',
              entityType: 'confirmation',
              entityId: String(doc?.id),
              scope: 'confirmation',
              severity: 'important',
              summary: `${actorName} confirmed child profile for ${doc?.fullName || 'this child'}`,
              meta: {
                actorName,
                childName: doc?.fullName,
                previousStatus: prevStatus,
                status: nextStatus,
                confirmedAt: doc?.confirmedAt ?? null,
              },
            })

            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId,
              type: 'status',
              event: 'confirmed',
              title: `${doc?.fullName || 'Child profile'} was confirmed`,
              message: `${actorName} confirmed this child profile.`,
              link: `/child-info/${doc?.id}`,
              meta: {
                actorName,
                childName: doc?.fullName,
                previousStatus: prevStatus,
                status: nextStatus,
                confirmedAt: doc?.confirmedAt ?? null,
                eventType: 'child-profile',
              },
            })

            return
          }

          const changes: Array<{ field: string; from?: any; to?: any }> = []

          pushChange(changes, 'fullName', previousDoc?.fullName, doc?.fullName)
          pushChange(changes, 'birthDate', previousDoc?.birthDate, doc?.birthDate)
          pushChange(changes, 'gender', previousDoc?.gender, doc?.gender)
          pushChange(changes, 'nationalId', previousDoc?.nationalId, doc?.nationalId)
          pushChange(changes, 'status', previousDoc?.status, doc?.status)
          pushChange(changes, 'avatar', previousDoc?.avatar, doc?.avatar)

          pushChange(
            changes,
            'school.schoolName',
            previousDoc?.school?.schoolName,
            doc?.school?.schoolName,
          )
          pushChange(
            changes,
            'school.className',
            previousDoc?.school?.className,
            doc?.school?.className,
          )
          pushChange(
            changes,
            'school.mainTeacher',
            previousDoc?.school?.mainTeacher,
            doc?.school?.mainTeacher,
          )

          pushChange(
            changes,
            'medical.bloodType',
            previousDoc?.medical?.bloodType,
            doc?.medical?.bloodType,
          )
          pushChange(
            changes,
            'medical.notesShort',
            previousDoc?.medical?.notesShort,
            doc?.medical?.notesShort,
          )
          pushChange(
            changes,
            'medical.allergies',
            JSON.stringify(previousDoc?.medical?.allergies ?? []),
            JSON.stringify(doc?.medical?.allergies ?? []),
          )
          pushChange(
            changes,
            'medical.conditions',
            JSON.stringify(previousDoc?.medical?.conditions ?? []),
            JSON.stringify(doc?.medical?.conditions ?? []),
          )
          pushChange(
            changes,
            'medical.gp',
            JSON.stringify(previousDoc?.medical?.gp ?? {}),
            JSON.stringify(doc?.medical?.gp ?? {}),
          )
          pushChange(
            changes,
            'emergencyContacts',
            JSON.stringify(previousDoc?.emergencyContacts ?? []),
            JSON.stringify(doc?.emergencyContacts ?? []),
          )

          if (!changes.length) return

          const wasResetToPending =
            prevStatus === 'confirmed' &&
            nextStatus === 'pending' &&
            changes.some((c) => c.field === 'status')

          await logAudit(req, {
            familyId,
            childId,
            childName: doc?.fullName,
            action: 'child.update',
            entityType: 'child',
            entityId: String(doc?.id),
            scope: 'child_profile',
            severity: wasResetToPending ? 'important' : 'info',
            summary: wasResetToPending
              ? `${actorName} updated ${doc?.fullName || 'this child'} and profile needs confirmation again`
              : `${actorName} updated child profile for ${doc?.fullName || 'this child'}`,
            changes,
            meta: {
              actorName,
              childName: doc?.fullName,
              previousStatus: prevStatus,
              status: nextStatus,
              wasResetToPending,
              needsConfirmation: nextStatus === 'pending',
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'status',
            event: 'updated',
            title: wasResetToPending
              ? `${doc?.fullName || 'Child profile'} needs confirmation`
              : `Child profile updated: ${doc?.fullName || 'Child'}`,
            message: wasResetToPending
              ? `${actorName} updated this child profile. Waiting for second parent confirmation.`
              : `${actorName} updated this child profile.`,
            link: `/child-info/${doc?.id}`,
            meta: {
              actorName,
              childName: doc?.fullName,
              previousStatus: prevStatus,
              status: nextStatus,
              wasResetToPending,
              eventType: 'child-profile',
              needsConfirmation: nextStatus === 'pending',
            },
          })
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
    },

    { name: 'fullName', label: 'Full name', type: 'text', required: true },

    { name: 'birthDate', label: 'Birth date', type: 'date', required: true },

    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      required: false,
      defaultValue: 'na',
      options: [
        { label: 'Prefer not to say', value: 'na' },
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
      ],
    },

    {
      name: 'avatar',
      label: 'Avatar',
      type: 'upload',
      relationTo: 'media',
      required: false,
      admin: {
        description: 'Upload an image (JPG/PNG).',
      },
    },

    {
      name: 'nationalId',
      label: 'Số định danh (11 số)',
      type: 'text',
      required: false,
      validate: (value: any) => {
        if (!value) return true
        const v = String(value).replace(/\s+/g, '')
        if (!/^\d{11}$/.test(v)) return 'Số định danh phải gồm đúng 11 chữ số.'
        return true
      },
    },

    {
      name: 'medical',
      type: 'group',
      label: 'Medical (Emergency)',
      fields: [
        {
          name: 'bloodType',
          label: 'Blood type',
          type: 'select',
          defaultValue: 'unknown',
          options: [
            { label: 'Unknown', value: 'unknown' },
            { label: 'A', value: 'A' },
            { label: 'B', value: 'B' },
            { label: 'AB', value: 'AB' },
            { label: 'O', value: 'O' },
            { label: 'A+', value: 'A+' },
            { label: 'A-', value: 'A-' },
            { label: 'B+', value: 'B+' },
            { label: 'B-', value: 'B-' },
            { label: 'AB+', value: 'AB+' },
            { label: 'AB-', value: 'AB-' },
            { label: 'O+', value: 'O+' },
            { label: 'O-', value: 'O-' },
          ],
        },
        {
          name: 'allergies',
          label: 'Allergies (tags)',
          type: 'array',
          fields: [{ name: 'value', type: 'text', required: true }],
        },
        {
          name: 'conditions',
          label: 'Conditions (tags)',
          type: 'array',
          fields: [{ name: 'value', type: 'text', required: true }],
        },
        {
          name: 'notesShort',
          label: 'Medical note (short)',
          type: 'text',
        },
        {
          name: 'gp',
          label: 'Primary doctor (GP)',
          type: 'group',
          fields: [
            { name: 'name', type: 'text' },
            { name: 'clinic', type: 'text' },
            {
              name: 'phones',
              type: 'array',
              fields: [{ name: 'value', type: 'text', required: true }],
            },
          ],
        },
      ],
    },

    {
      name: 'school',
      type: 'group',
      label: 'School',
      fields: [
        { name: 'schoolName', type: 'text' },
        { name: 'className', type: 'text' },
        { name: 'mainTeacher', type: 'text' },
      ],
    },

    {
      name: 'emergencyContacts',
      label: 'Emergency contacts',
      type: 'array',
      validate: (value: any) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'Please add at least one emergency contact.'
        }

        const ok = value.every(
          (c: any) => c?.name && Array.isArray(c?.phones) && c.phones.length > 0,
        )
        if (!ok) {
          return 'Each emergency contact must have a name and at least one phone number.'
        }

        const hasPrimary = value.some((c: any) => !!c?.isPrimary)
        if (!hasPrimary) {
          return 'Please select one primary emergency contact.'
        }

        return true
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'relation',
          type: 'select',
          required: false,
          options: [
            { label: 'Mother', value: 'mother' },
            { label: 'Father', value: 'father' },
            { label: 'Grandparent', value: 'grandparent' },
            { label: 'Guardian', value: 'guardian' },
            { label: 'Babysitter', value: 'babysitter' },
            { label: 'Relative', value: 'relative' },
            { label: 'Other', value: 'other' },
          ],
        },
        { name: 'isPrimary', type: 'checkbox', defaultValue: false },
        {
          name: 'phones',
          type: 'array',
          fields: [
            {
              name: 'value',
              type: 'text',
              required: true,
              validate: (value: any) => {
                const v = String(value ?? '').trim()
                if (!v) return 'Phone is required.'
                if (!/^[+\d\s]{6,}$/.test(v)) return 'Invalid phone number.'
                return true
              },
            },
          ],
        },
      ],
    },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'lastEditedBy',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'confirmedBy',
      type: 'relationship',
      relationTo: 'customers',
    },
    {
      name: 'confirmedAt',
      type: 'date',
    },
  ],
}