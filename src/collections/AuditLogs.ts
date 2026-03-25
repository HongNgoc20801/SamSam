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
  admin: {
    useAsTitle: 'action',
    defaultColumns: [
      'createdAt',
      'childNameSnapshot',
      'actorName',
      'actorRole',
      'relatedToRole',
      'action',
      'entityType',
      'severity',
    ],
  },

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
      name: 'childNameSnapshot',
      type: 'text',
    },

    {
      name: 'actorId',
      type: 'text',
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
      name: 'actorRole',
      type: 'select',
      options: [
        { label: 'Mother', value: 'mother' },
        { label: 'Father', value: 'father' },
        { label: 'Parent', value: 'parent' },
        { label: 'Admin', value: 'admin' },
        { label: 'System', value: 'system' },
      ],
      index: true,
    },
    {
      name: 'relatedToRole',
      type: 'select',
      options: [
        { label: 'Mother', value: 'mother' },
        { label: 'Father', value: 'father' },
        { label: 'Both parents', value: 'both' },
        { label: 'Child', value: 'child' },
        { label: 'System', value: 'system' },
      ],
      index: true,
    },
    {
      name: 'actorName',
      type: 'text',
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
        { label: 'Post', value: 'post' },
        { label: 'Economy', value: 'economy' },
        { label: 'Confirmation', value: 'confirmation' },
        { label: 'Other', value: 'other' },
      ],
      index: true,
    },

    {
      name: 'scope',
      type: 'select',
      options: [
        { label: 'Calendar', value: 'calendar' },
        { label: 'Economy', value: 'economy' },
        { label: 'Documents', value: 'documents' },
        { label: 'Child profile', value: 'child_profile' },
        { label: 'Confirmation', value: 'confirmation' },
        { label: 'System', value: 'system' },
        { label: 'Other', value: 'other' },
      ],
      index: true,
    },

    {
      name: 'severity',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Important', value: 'important' },
        { label: 'Critical', value: 'critical' },
      ],
      index: true,
    },

    {
      name: 'visibleInFamilyTimeline',
      type: 'checkbox',
      defaultValue: true,
      index: true,
    },

    {
      name: 'entityId',
      type: 'text',
      index: true,
    },
    {
      name: 'targetLabel',
      type: 'text',
    },

    {
      name: 'summary',
      type: 'text',
    },

    {
      name: 'changes',
      type: 'array',
      fields: [
        { name: 'field', type: 'text', required: true },
        { name: 'from', type: 'text' },
        { name: 'to', type: 'text' },
      ],
    },

    {
      name: 'meta',
      type: 'json',
    },
  ],
}