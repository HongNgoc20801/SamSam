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

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return typeof u.family === 'string' ? u.family : u.family?.id ?? null
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  auth: true,
  admin: { useAsTitle: 'email' },

  access: {
    create: () => true,

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) {
        return { id: { equals: req.user.id } }
      }

      return {
        family: { equals: familyId },
      }
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      return { id: { equals: req.user.id } }
    },

    delete: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      return { id: { equals: req.user.id } }
    },
  },

  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation !== 'create') return
        if ((doc as any)?.family) return

        const userId = (doc as any).id
        req.payload.logger.info(`Customers.afterChange(create): ${userId}`)

        try {
          const family = await req.payload.create({
            collection: 'families',
            data: {
              name: `${(doc as any).firstName ?? 'My'} family`,
              members: [userId],
            } as any,
            overrideAccess: true,
          })

          await req.payload.update({
            collection: 'customers',
            id: userId,
            data: { family: family.id } as any,
            overrideAccess: true,
          })

          req.payload.logger.info(`Family created & linked: family=${family.id}, customer=${userId}`)
        } catch (e) {
          req.payload.logger.error(e)
        }
      },
    ],
  },

  fields: [
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    { name: 'birthDate', type: 'date', required: true },
    { name: 'phone', type: 'text', required: true },
    { name: 'address', type: 'text', required: true },

    {
      name: 'gender',
      type: 'select',
      required: true,
      options: [
        { label: 'Mann', value: 'male' },
        { label: 'Kvinne', value: 'female' },
        { label: 'Annet', value: 'other' },
      ],
    },

    {
      name: 'familyRole',
      type: 'select',
      required: true,
      options: [
        { label: 'Far', value: 'father' },
        { label: 'Mor', value: 'mother' },
        { label: 'Søsken', value: 'sibling' },
        { label: 'Annet', value: 'other' },
      ],
    },

    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
    },
  ],
}