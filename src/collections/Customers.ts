import type { CollectionConfig } from 'payload'
import type { Where } from 'payload'

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

function cleanText(v: any, max = 120) {
  return String(v ?? '').trim().slice(0, max)
}

function cleanPhone(v: any) {
  return String(v ?? '').trim()
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

  const familyId = getFamilyIdFromUser(req)

  if (!familyId) {
    const where: Where = {
      id: {
        equals: req.user.id,
      },
    }

    return where
  }


  const where: Where = {
    or: [
      {
        id: {
          equals: req.user.id,
        },
      },
      {
        family: {
          equals: familyId,
        },
      },
    ],
  }

  return where
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

  endpoints: [
    {
      path: '/change-password',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user || !isCustomer(req)) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const body =
            typeof req.json === 'function' ? await req.json().catch(() => ({})) : req.body ?? {}

          const currentPassword = String(body?.currentPassword ?? '')
          const newPassword = String(body?.newPassword ?? '')
          const confirmPassword = String(body?.confirmPassword ?? '')

          if (!currentPassword || !newPassword || !confirmPassword) {
            return Response.json(
              { message: 'All password fields are required.' },
              { status: 400 },
            )
          }

          if (newPassword.length < 6) {
            return Response.json(
              { message: 'New password must be at least 6 characters.' },
              { status: 400 },
            )
          }

          if (newPassword !== confirmPassword) {
            return Response.json(
              { message: 'New password and confirmation do not match.' },
              { status: 400 },
            )
          }

          const userId = req.user.id
          const email = req.user.email

          const loginResult = await req.payload.login({
            collection: 'customers',
            data: {
              email,
              password: currentPassword,
            },
            req,
          }).catch(() => null)

          if (!loginResult?.user) {
            return Response.json(
              { message: 'Current password is incorrect.' },
              { status: 400 },
            )
          }

          await req.payload.update({
            collection: 'customers',
            id: userId,
            data: {
              password: newPassword,
            },
            req,
            overrideAccess: true,
          })

          return Response.json({ ok: true, message: 'Password updated successfully.' })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not change password.' },
            { status: 400 },
          )
        }
      },
    },
  ],

  hooks: {
    beforeValidate: [
      ({ data }) => {
        const next: any = { ...(data ?? {}) }

        if ('firstName' in next) next.firstName = cleanText(next.firstName, 60)
        if ('lastName' in next) next.lastName = cleanText(next.lastName, 60)
        if ('address' in next) next.address = cleanText(next.address, 200)
        if ('phone' in next) next.phone = cleanPhone(next.phone)

        return next
      },
    ],

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
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },

    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
    },
  ],
}