import type { CollectionConfig } from 'payload'

function getCollectionSlug(req: any) {
  return req?.user?.collection ?? req?.user?._collection
}
function isAdmin(req: any) {
  return getCollectionSlug(req) === 'users'
}
function isCustomer(req: any) {
  return getCollectionSlug(req) === 'customers'
}
function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return typeof u.family === 'string' ? u.family : u.family?.id ?? null
}

function cleanPhone(v: any) {
  if (!v) return ''
  return String(v).trim()
}

export const Children: CollectionConfig = {
  slug: 'children',
  admin: { useAsTitle: 'fullName' },

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

    delete: ({ req }) => isAdmin(req),
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        const next: any = { ...(data ?? {}) }

        // normalize
        if (next.fullName) next.fullName = String(next.fullName).trim()
        if (next.nationalId) next.nationalId = String(next.nationalId).replace(/\s+/g, '')

        // primary emergency contact
        if (next?.emergencyContact?.name) next.emergencyContact.name = String(next.emergencyContact.name).trim()
        if (next?.emergencyContact?.phone) next.emergencyContact.phone = cleanPhone(next.emergencyContact.phone)

        // additional contacts
        if (Array.isArray(next?.emergencyContacts) && next.emergencyContacts.length) {
          next.emergencyContacts = next.emergencyContacts
            .map((c: any) => ({
              ...c,
              name: String(c?.name ?? '').trim(),
              phone: cleanPhone(c?.phone),
            }))
            .filter((c: any) => c.name || c.phone) // drop empty rows
        }

        // medical tags
        if (next?.medical?.allergies?.length) {
          next.medical.allergies = next.medical.allergies
            .map((x: any) => ({ value: String(x?.value ?? '').trim() }))
            .filter((x: any) => x.value)
        }
        if (next?.medical?.conditions?.length) {
          next.medical.conditions = next.medical.conditions
            .map((x: any) => ({ value: String(x?.value ?? '').trim() }))
            .filter((x: any) => x.value)
        }

        if (operation !== 'create') return next

        const familyId = getFamilyIdFromUser(req)
        const userId = (req.user as any)?.id

        return {
          ...next,
          family: next.family ?? familyId,
          createdBy: next.createdBy ?? userId,
          status: next.status ?? 'pending',
        }
      },
    ],
  },

  fields: [
    // scope
    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
      required: true,
      index: true,
    },

    // identity
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
      name: 'avatarURL',
      label: 'Avatar URL',
      type: 'text',
      required: false,
      admin: { description: 'MVP: store an image URL. Later change to Upload.' },
    },

    // admin (paperwork)
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

    // medical
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
          admin: { description: 'Bệnh nền / tình trạng sức khoẻ (nếu có).' },
        },

        {
          name: 'medications',
          label: 'Medications',
          type: 'array',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'dose', type: 'text' },
            { name: 'notes', type: 'text' },
          ],
        },

        { name: 'notesShort', label: 'Medical note (short)', type: 'text' },
      ],
    },

    // school
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

    // emergency primary
    {
      name: 'emergencyContact',
      label: 'Primary emergency contact',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'relation',
          type: 'select',
          options: [
            { label: 'Mother', value: 'mother' },
            { label: 'Father', value: 'father' },
            { label: 'Grandparent', value: 'grandparent' },
            { label: 'Guardian', value: 'guardian' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'phone',
          type: 'text',
          validate: (value: any) => {
            if (!value) return true
            const v = String(value).trim()
            if (!/^[+\d\s]{6,}$/.test(v)) return 'Invalid phone number.'
            return true
          },
        },
      ],
    },

    // emergency additional (many)
    {
      name: 'emergencyContacts',
      label: 'Additional emergency contacts',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'relation',
          type: 'select',
          required: true,
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
        {
          name: 'phone',
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

    // governance
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
    { name: 'createdBy', type: 'relationship', relationTo: 'customers' },
  ],
}
