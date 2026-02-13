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

    delete: ({ req }) => isAdmin(req), // MVP: chặn xoá với customer
  },

  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        const familyId = getFamilyIdFromUser(req)
        const userId = (req.user as any)?.id

        return {
          ...(data ?? {}),
          family: (data as any)?.family ?? familyId,
          createdBy: (data as any)?.createdBy ?? userId,
          status: (data as any)?.status ?? 'pending',
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
    { name: 'fullName', type: 'text', required: true },
    { name: 'birthDate', type: 'date', required: true },
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
  ],
}
