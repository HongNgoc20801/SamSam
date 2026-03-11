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

export const AuditLogs: CollectionConfig = {
  slug: 'audit_logs',
  admin: { useAsTitle: 'action' },

  access: {
    create: ({ req }) => !!req.user && isAdmin(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return { family: { equals: familyId } }
    },

    update: ({ req }) => !!req.user && isAdmin(req),
    delete: ({ req }) => !!req.user && isAdmin(req),
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
      required: false,
      index: true,
    },

    {
      name: 'actorId',
      type: 'text',
      required: false,
      index: true,
    },
    {
      name: 'actorType',
      type: 'select',
      required: true,
      options: [
        { label: 'Customer', value: 'customer' },
        { label: 'Admin', value: 'admin' },
        { label: 'System', value: 'system' },
      ],
      index: true,
    },
    {
      name: 'actorName',
      type: 'text',
      required: false,
    },

    {
      name: 'action',
      type: 'text',
      required: true,
      index: true,
    },

    {
      name: 'entityType',
      type: 'select',
      required: true,
      options: [
        { label: 'Child', value: 'child' },
        { label: 'Document', value: 'document' },
        { label: 'Event', value: 'event' },
        { label: 'Other', value: 'other' },
      ],
      index: true,
    },

    {
      name: 'entityId',
      type: 'text',
      required: false,
      index: true,
    },

    {
      name: 'summary',
      type: 'text',
      required: false,
    },

    {
      name: 'changes',
      type: 'array',
      required: false,
      fields: [
        { name: 'field', type: 'text', required: true },
        { name: 'from', type: 'text', required: false },
        { name: 'to', type: 'text', required: false },
      ],
    },

    {
      name: 'meta',
      type: 'json',
      required: false,
    },
  ],
}