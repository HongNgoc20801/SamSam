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

function normalizeRelId(v: any): string | number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string' || typeof v === 'number') return v
  return v?.id ?? null
}

function getRouteId(req: any) {
  return req?.routeParams?.id ?? req?.params?.id ?? null
}

export const Notifications: CollectionConfig = {
  slug: 'notifications',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'recipient', 'isRead', 'createdAt'],
  },

  access: {
    create: ({ req }) => !!req.user && (isAdmin(req) || isCustomer(req)),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      return {
        recipient: { equals: req.user.id },
      }
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      return {
        recipient: { equals: req.user.id },
      }
    },

    delete: ({ req }) => {
      if (!req.user) return false
      return isAdmin(req)
    },
  },

  endpoints: [
    {
      path: '/me',
      method: 'get',
      handler: async (req: any) => {
        try {
          if (!req.user || !isCustomer(req)) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const result = await req.payload.find({
            collection: 'notifications',
            where: {
              recipient: { equals: req.user.id },
            },
            sort: '-createdAt',
            limit: 30,
            req,
            overrideAccess: true,
          })

          return Response.json(result)
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not load notifications.' },
            { status: 400 },
          )
        }
      },
    },

    {
      path: '/me/unread-count',
      method: 'get',
      handler: async (req: any) => {
        try {
          if (!req.user || !isCustomer(req)) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const result = await req.payload.find({
            collection: 'notifications',
            where: {
              and: [
                { recipient: { equals: req.user.id } },
                { isRead: { equals: false } },
              ],
            },
            limit: 1,
            req,
            overrideAccess: true,
          })

          return Response.json({
            count: result.totalDocs ?? 0,
          })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not load unread count.' },
            { status: 400 },
          )
        }
      },
    },

    {
      path: '/:id/read',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user || !isCustomer(req)) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const id = getRouteId(req)
          if (!id) {
            return Response.json(
              { message: 'Missing notification id.' },
              { status: 400 },
            )
          }

          const doc = await req.payload
            .findByID({
              collection: 'notifications',
              id,
              req,
              overrideAccess: true,
            })
            .catch(() => null)

          if (!doc) {
            return Response.json(
              { message: 'Notification not found.' },
              { status: 404 },
            )
          }

          const recipientId =
            typeof doc.recipient === 'object'
              ? normalizeRelId(doc.recipient)
              : doc.recipient

          if (String(recipientId) !== String(req.user.id)) {
            return Response.json(
              { message: 'Notification not found.' },
              { status: 404 },
            )
          }

          const updated = await req.payload.update({
            collection: 'notifications',
            id,
            data: {
              isRead: true,
              readAt: new Date().toISOString(),
            },
            req,
            overrideAccess: true,
          })

          return Response.json({ ok: true, doc: updated })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not mark notification as read.' },
            { status: 400 },
          )
        }
      },
    },

    {
      path: '/read-all',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user || !isCustomer(req)) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const unread = await req.payload.find({
            collection: 'notifications',
            where: {
              and: [
                { recipient: { equals: req.user.id } },
                { isRead: { equals: false } },
              ],
            },
            limit: 200,
            req,
            overrideAccess: true,
          })

          for (const doc of unread.docs ?? []) {
            await req.payload.update({
              collection: 'notifications',
              id: doc.id,
              data: {
                isRead: true,
                readAt: new Date().toISOString(),
              },
              req,
              overrideAccess: true,
            })
          }

          return Response.json({
            ok: true,
            updated: unread.docs?.length ?? 0,
          })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not mark all notifications as read.' },
            { status: 400 },
          )
        }
      },
    },
  ],

  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'family',
      type: 'relationship',
      relationTo: 'families',
      required: false,
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Calendar', value: 'calendar' },
        { label: 'Expense', value: 'expense' },
        { label: 'Status', value: 'status' },
        { label: 'Documents', value: 'documents' },
      ],
      index: true,
    },
    {
      name: 'event',
      type: 'select',
      required: true,
      options: [
        { label: 'Created', value: 'created' },
        { label: 'Updated', value: 'updated' },
        { label: 'Deleted', value: 'deleted' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Commented', value: 'commented' },
        { label: 'Liked', value: 'liked' },
        { label: 'Uploaded', value: 'uploaded' },
        { label: 'Replaced', value: 'replaced' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
    },
    {
      name: 'link',
      type: 'text',
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'readAt',
      type: 'date',
    },
    {
      name: 'meta',
      type: 'json',
    },
  ],
}