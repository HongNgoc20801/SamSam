import type { CollectionConfig, Where } from 'payload'
import { logAudit } from '@/app/lib/logAudit'

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

  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  if (typeof v === 'object' && v?.id !== undefined && v?.id !== null) {
    return normalizeRelId(v.id)
  }

  return null
}

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return normalizeRelId(u.family)
}

function getFamilyIdFromDoc(doc: any) {
  return normalizeRelId(doc?.family)
}

function cleanText(v: any, max = 5000) {
  return String(v ?? '').trim().slice(0, max)
}

function getAuthorName(req: any) {
  const u: any = req?.user
  if (!u) return 'Unknown user'

  const full = `${String(u?.firstName ?? '').trim()} ${String(u?.lastName ?? '').trim()}`.trim()
  return full || u?.fullName || u?.name || u?.email || String(u?.id)
}

function asText(v: any) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function pushChange(
  changes: Array<{ field: string; from?: any; to?: any }>,
  field: string,
  from: any,
  to: any,
) {
  if (asText(from) !== asText(to)) {
    changes.push({ field, from, to })
  }
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['authorName', 'type', 'important', 'createdAt'],
  },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      const where: Where = {
        family: { equals: familyId },
      }

      return where
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      const userId = normalizeRelId((req.user as any)?.id)

      if (!familyId || !userId) return false

      const where: Where = {
        and: [
          { family: { equals: familyId } },
          { author: { equals: userId } },
        ],
      }

      return where
    },

    delete: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      const userId = normalizeRelId((req.user as any)?.id)

      if (!familyId || !userId) return false

      const where: Where = {
        and: [
          { family: { equals: familyId } },
          { author: { equals: userId } },
        ],
      }

      return where
    },
  },

  hooks: {
    beforeValidate: [
      async (args: any) => {
        const { data, req, operation } = args
        const originalDoc = args?.originalDoc ?? args?.previousDoc ?? args?.doc ?? null

        const next: any = { ...(data ?? {}) }

        if (next.title !== undefined) next.title = cleanText(next.title, 120)
        if (next.content !== undefined) next.content = cleanText(next.content, 5000)

        if (Array.isArray(next.attachments)) {
          next.attachments = next.attachments
            .map((x: any) => normalizeRelId(x))
            .filter(Boolean)
        }

        const userId = normalizeRelId((req.user as any)?.id)
        const userFamilyId = getFamilyIdFromUser(req)

        const currentFamilyId =
          normalizeRelId(next.family) ??
          normalizeRelId(originalDoc?.family) ??
          normalizeRelId(userFamilyId)

        const requestedChildId =
          'child' in next ? normalizeRelId(next.child) : normalizeRelId(originalDoc?.child)

        const resolvedType = String(
          next.type ?? originalDoc?.type ?? (requestedChildId ? 'child-update' : 'general'),
        ).trim()

        const resolvedContent =
          'content' in next
            ? cleanText(next.content, 5000)
            : cleanText(originalDoc?.content, 5000)

        if (!resolvedContent) {
          throw new Error('Post content is required.')
        }

        if (operation === 'create') {
          if (!isCustomer(req)) {
            throw new Error('Only customers can create posts.')
          }

          if (!userId) {
            throw new Error('Missing current user.')
          }

          if (!userFamilyId) {
            throw new Error('Your account is not in a family group yet.')
          }
        }

        if (!currentFamilyId) {
          throw new Error('Missing family for post.')
        }

        let finalChildId: string | number | null = null

        if (resolvedType === 'child-update') {
          if (!requestedChildId) {
            throw new Error('Please choose a child for a child update.')
          }

          const childDoc = await req.payload.findByID({
            collection: 'children',
            id: requestedChildId,
            req,
            overrideAccess: true,
            depth: 0,
          })

          const childFamilyId = normalizeRelId(childDoc?.family)

          if (!childFamilyId || String(childFamilyId) !== String(currentFamilyId)) {
            throw new Error('This child does not belong to your family.')
          }

          finalChildId = requestedChildId
        }

        if (operation === 'create') {
          return {
            ...next,
            family: currentFamilyId,
            author: userId,
            authorName: getAuthorName(req),
            type: resolvedType === 'child-update' ? 'child-update' : 'general',
            child: finalChildId ?? undefined,
            content: resolvedContent,
            important: !!next.important,
            attachments: Array.isArray(next.attachments) ? next.attachments : [],
          }
        }

        if (operation === 'update') {
          return {
            ...next,

            // giữ nguyên các field required cũ
            family: normalizeRelId(originalDoc?.family) ?? currentFamilyId,
            author: normalizeRelId(originalDoc?.author) ?? userId,
            authorName: originalDoc?.authorName ?? getAuthorName(req),

            type: resolvedType === 'child-update' ? 'child-update' : 'general',
            child: finalChildId ?? undefined,
            content: resolvedContent,
            important: !!next.important,

            attachments: Array.isArray(next.attachments)
              ? next.attachments
              : originalDoc?.attachments ?? [],
          }
        }

        return next
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getFamilyIdFromDoc(doc)
        const childId = normalizeRelId(doc?.child)

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId,
            action: 'post.create',
            entityType: 'other',
            entityId: String(doc?.id),
            summary: 'Created family post',
            meta: {
              title: doc?.title,
              type: doc?.type,
              important: !!doc?.important,
              attachmentsCount: Array.isArray(doc?.attachments) ? doc.attachments.length : 0,
            },
          })
          return
        }

        if (operation === 'update') {
          const changes: Array<{ field: string; from?: any; to?: any }> = []

          pushChange(changes, 'title', previousDoc?.title, doc?.title)
          pushChange(changes, 'content', previousDoc?.content, doc?.content)
          pushChange(changes, 'type', previousDoc?.type, doc?.type)
          pushChange(
            changes,
            'child',
            normalizeRelId(previousDoc?.child),
            normalizeRelId(doc?.child),
          )
          pushChange(changes, 'important', !!previousDoc?.important, !!doc?.important)
          pushChange(
            changes,
            'attachments',
            JSON.stringify(previousDoc?.attachments ?? []),
            JSON.stringify(doc?.attachments ?? []),
          )

          if (!changes.length) return

          await logAudit(req, {
            familyId,
            childId,
            action: 'post.update',
            entityType: 'other',
            entityId: String(doc?.id),
            summary: 'Updated family post',
            changes,
            meta: {
              title: doc?.title,
              type: doc?.type,
              important: !!doc?.important,
              attachmentsCount: Array.isArray(doc?.attachments) ? doc.attachments.length : 0,
            },
          })
        }
      },
    ],

    afterDelete: [
      async ({ doc, req }: any) => {
        if (!req?.user || !doc) return

        await logAudit(req, {
          familyId: getFamilyIdFromDoc(doc),
          childId: normalizeRelId(doc?.child),
          action: 'post.delete',
          entityType: 'other',
          entityId: String(doc?.id),
          summary: 'Deleted family post',
          meta: {
            title: doc?.title,
            type: doc?.type,
            important: !!doc?.important,
            attachmentsCount: Array.isArray(doc?.attachments) ? doc.attachments.length : 0,
          },
        })
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
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Child update', value: 'child-update' },
      ],
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
      name: 'title',
      type: 'text',
      required: false,
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'important',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      required: false,
    },
  ],
}