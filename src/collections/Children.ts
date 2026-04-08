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

/**
 * Những field này mà thay đổi sau khi đã CONFIRMED thì nên reset lại về PENDING.
 */
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

        /**
         * normalize basic
         */
        if (next.fullName) next.fullName = String(next.fullName).trim()
        if (next.nationalId) next.nationalId = String(next.nationalId).replace(/\s+/g, '')

        /**
         * normalize emergencyContacts
         */
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

        /**
         * ensure one primary contact
         */
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

        /**
         * normalize medical
         */
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

        /**
         * normalize school
         */
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

        /**
         * CREATE
         */
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
            status: next.status ?? 'pending',
            confirmedBy: null,
            confirmedAt: null,
          }
        }

        /**
         * UPDATE
         */
        if (operation === 'update') {
          const userId = (req.user as any)?.id

          const wantsConfirm = next?.status === 'confirmed'
          const wasPending = originalDoc?.status === 'pending'

          /**
           * confirm flow
           */
          if (wantsConfirm && wasPending) {
            const createdById =
              typeof originalDoc?.createdBy === 'string'
                ? originalDoc.createdBy
                : originalDoc?.createdBy?.id

            if (createdById && createdById === userId) {
              throw new Error(
                'You cannot confirm a child profile that you created. The other parent must confirm it.',
              )
            }

            next.status = 'confirmed'
            next.confirmedBy = userId
            next.confirmedAt = new Date().toISOString()
            return next
          }

          /**
           * reset confirmed -> pending if important data changed
           */
          const wasConfirmed = originalDoc?.status === 'confirmed'

          if (wasConfirmed) {
            const merged = { ...(originalDoc ?? {}), ...(next ?? {}) }

            const prevKey = stableJson(pick(originalDoc, IMPORTANT_FIELDS as any))
            const nextKey = stableJson(pick(merged, IMPORTANT_FIELDS as any))

            if (prevKey !== nextKey) {
              next.status = 'pending'
              next.confirmedBy = null
              next.confirmedAt = null
            }
          }

          /**
           * prevent client from spoofing confirm fields
           */
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

        /**
         * CREATE
         */
        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId,
            action: 'child.create',
            entityType: 'child',
            entityId: String(doc?.id),
            summary: 'Created child profile',
            meta: {
              childName: doc?.fullName,
              status: doc?.status,
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'status',
            event: 'created',
            title: 'Child profile created',
            message: `${doc?.fullName || 'A child profile'} was created.`,
            link: `/child-info/${doc?.id}`,
            meta: {
              childName: doc?.fullName,
              status: doc?.status,
            },
          })

          return
        }

        /**
         * UPDATE
         */
        if (operation === 'update') {
          const prevStatus = previousDoc?.status
          const nextStatus = doc?.status
          const isConfirm = prevStatus === 'pending' && nextStatus === 'confirmed'

          /**
           * confirm action
           */
          if (isConfirm) {
            await logAudit(req, {
              familyId,
              childId,
              action: 'child.confirm',
              entityType: 'child',
              entityId: String(doc?.id),
              summary: 'Confirmed child profile',
              meta: {
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
              title: 'Child profile confirmed',
              message: `${doc?.fullName || 'Child profile'} was confirmed.`,
              link: `/child-info/${doc?.id}`,
              meta: {
                childName: doc?.fullName,
                previousStatus: prevStatus,
                status: nextStatus,
                confirmedAt: doc?.confirmedAt ?? null,
              },
            })

            return
          }

          /**
           * real update action
           */
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
            action: 'child.update',
            entityType: 'child',
            entityId: String(doc?.id),
            summary: 'Updated child profile',
            changes,
            meta: {
              childName: doc?.fullName,
              previousStatus: prevStatus,
              status: nextStatus,
              wasResetToPending,
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'status',
            event: 'updated',
            title: 'Child profile updated',
            message: `${doc?.fullName || 'A child profile'} was updated.`,
            link: `/child-info/${doc?.id}`,
            meta: {
              childName: doc?.fullName,
              previousStatus: prevStatus,
              status: nextStatus,
              wasResetToPending,
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