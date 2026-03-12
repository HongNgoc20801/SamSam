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

// ✅ check quyền update/delete theo family (không dùng doc để khỏi lỗi TS)
async function canMutateByFamily(req: any, id: string | number) {
  if (!req?.user) return false
  if (isAdmin(req)) return true

  const familyId = getFamilyIdFromUser(req)
  if (!familyId) return false

  const eventDoc = await req.payload
    .findByID({
      collection: 'calendar-events',
      id: id as any,
      overrideAccess: true, // ✅ bắt buộc để đọc doc khi access đang check
      depth: 0,
    })
    .catch(() => null)

  if (!eventDoc) return false

  const docFamilyId = getRelId((eventDoc as any).family)

  return String(docFamilyId) === String(familyId)
}

export const CalendarEvents: CollectionConfig = {
  slug: 'calendar-events',
  admin: { useAsTitle: 'title' },

  access: {
    create: ({ req }) => !!req.user && (isAdmin(req) || isCustomer(req)),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false
      return { family: { equals: familyId } }
    },

    update: async ({ req, id }) => {
      if (!id) return false
      return canMutateByFamily(req, id as any)
    },

    delete: async ({ req, id }) => {
      if (!id) return false
      return canMutateByFamily(req, id as any)
    },
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // chỉ set auto khi create
        if (operation !== 'create') return data

        const familyId = getFamilyIdFromUser(req)
        const userId = getRelId((req.user as any)?.id)
        if (!familyId || !userId) return data

        const childId = (data as any)?.child
        if (!childId) throw new Error('Missing child')

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

    { name: 'title', type: 'text', required: true },
    { name: 'notes', type: 'textarea' },

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

    { name: 'startAt', type: 'date', required: true },
    { name: 'endAt', type: 'date', required: true },

    { name: 'allDay', type: 'checkbox', defaultValue: false },

    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'customers',
    },
  ],
}