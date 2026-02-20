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

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false
      return { family: { equals: familyId } }
    },

    delete: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false
      return { family: { equals: familyId } }
    },
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // chỉ set auto khi create
        if (operation !== 'create') return data

        const familyId = getFamilyIdFromUser(req)
        const userId = (req.user as any)?.id
        if (!familyId || !userId) return data

        // bảo vệ: child phải thuộc cùng family
        const childId = (data as any)?.child
        if (!childId) {
          throw new Error('Missing child')
        }

        const child = await req.payload
          .findByID({
            collection: 'children',
            id: childId,
            overrideAccess: true,
          })
          .catch(() => null)

        const childFamilyId =
          typeof (child as any)?.family === 'string'
            ? (child as any).family
            : (child as any)?.family?.id ?? null

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

    // payload date: lưu ISO string
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