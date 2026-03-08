import type { CollectionConfig } from 'payload'

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

export const Media: CollectionConfig = {
  slug: 'media',

  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      return isCustomer(req)
    },

    create: ({ req }) => !!req.user && isCustomer(req),

    update: ({ req }) => !!req.user && (isAdmin(req) || isCustomer(req)),

    delete: ({ req }) => !!req.user && isAdmin(req),
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false,
    },
  ],

  upload: true,
}