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

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return typeof u.family === 'string' ? u.family : u.family?.id ?? null
}

function cleanText(v: any, max = 9999) {
  return String(v ?? '').trim().slice(0, max)
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

function getFamilyIdFromDoc(doc: any) {
  return typeof doc?.family === 'string' ? doc.family : doc?.family?.id ?? null
}

export const ChildDocuments: CollectionConfig = {
  slug: 'child_documents',
  admin: { useAsTitle: 'title' },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return { family: { equals: familyId } }
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return { family: { equals: familyId } }
    },

    // Phương án B: chỉ xóa document do chính mình upload trong family của mình
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
          { uploadedBy: { equals: userId } },
        ],
      }

      return where
    },
  },

  hooks: {
    beforeValidate: [
  async (args: any) => {
    const { data, req, operation, originalDoc, previousDoc, doc } = args
    const oldDoc = originalDoc ?? previousDoc ?? doc ?? null
    const next: any = { ...(data ?? {}) }

    if (next.title) next.title = cleanText(next.title, 120)
    if (next.noteShort) next.noteShort = cleanText(next.noteShort, 160)

    if (operation === 'create') {
      const familyId = getFamilyIdFromUser(req)
      const userId = normalizeRelId((req.user as any)?.id)

      if (!familyId) {
        throw new Error('Your account is not in a family group yet.')
      }
      if (!userId) {
        throw new Error('Missing current user.')
      }
      if (!isCustomer(req)) {
        throw new Error('Only customers can upload child documents.')
      }

      const childId = normalizeRelId(next.child)
      const mediaId = normalizeRelId(next.file)

      if (!childId) throw new Error('Missing child.')
      if (!mediaId) throw new Error('Missing uploaded file (media).')

      if (!next.category) next.category = 'other'

      const childDoc = await req.payload.findByID({
        collection: 'children',
        id: childId,
        req,
        overrideAccess: true,
      })

      if (!childDoc?.id) {
        throw new Error('Child not found.')
      }

      const childFamilyId =
        typeof childDoc.family === 'string'
          ? childDoc.family
          : childDoc.family?.id ?? null

      if (childFamilyId !== familyId) {
        throw new Error('You do not have permission to upload documents for this child.')
      }

      const mediaDoc = await req.payload.findByID({
        collection: 'media',
        id: mediaId,
        req,
        overrideAccess: true,
      })

      if (!mediaDoc?.id) {
        throw new Error('Uploaded media not found.')
      }

      let version = 1
      if (next.replaces) {
        try {
          const prev = await req.payload.findByID({
            collection: 'child_documents',
            id: normalizeRelId(next.replaces),
            req,
            overrideAccess: true,
          })
          version = Number(prev?.version || 1) + 1
        } catch {
          version = 2
        }
      }

      return {
        ...next,
        family: familyId,
        uploadedBy: userId,
        child: childId,
        file: mediaId,
        version,
      }
    }

    if (operation === 'update') {
      if (!oldDoc?.id) {
        throw new Error('Original document not found.')
      }

      next.family = oldDoc.family
      next.uploadedBy = oldDoc.uploadedBy
      next.version = oldDoc.version
      next.child = oldDoc.child
      next.file = oldDoc.file
      next.replaces = oldDoc.replaces

      if ('child' in data && normalizeRelId(data.child) !== normalizeRelId(oldDoc?.child)) {
        throw new Error('Changing child is not allowed.')
      }

      if ('file' in data && normalizeRelId(data.file) !== normalizeRelId(oldDoc?.file)) {
        throw new Error('Changing file is not allowed. Upload a new document instead.')
      }

      if ('replaces' in data && normalizeRelId(data.replaces) !== normalizeRelId(oldDoc?.replaces)) {
        throw new Error('To replace a document, create a new document with replaces=<oldDocId>.')
      }

      return next
    }

    return next
  },
],

afterChange: [
  async ({ doc, previousDoc, operation, req }: any) => {
    if (!req?.user || !doc) return

    const childId = normalizeRelId(doc?.child)
    const familyId = getFamilyIdFromDoc(doc)

    if (operation === 'create') {
      await logAudit(req, {
        familyId,
        childId,
        action: doc?.replaces ? 'doc.replace' : 'doc.upload',
        entityType: 'document',
        entityId: String(doc?.id),
        summary: doc?.replaces ? 'Replaced document' : 'Uploaded document',
        meta: {
          documentTitle: doc?.title,
          documentCategory: doc?.category,
          version: doc?.version,
          replaces: doc?.replaces ? String(normalizeRelId(doc.replaces)) : null,
        },
      })
      return
    }

    if (operation === 'update') {
      const changes: Array<{ field: string; from?: any; to?: any }> = []

      pushChange(changes, 'title', previousDoc?.title, doc?.title)
      pushChange(changes, 'category', previousDoc?.category, doc?.category)
      pushChange(changes, 'noteShort', previousDoc?.noteShort, doc?.noteShort)

      if (!changes.length) return

      await logAudit(req, {
        familyId,
        childId,
        action: 'doc.update',
        entityType: 'document',
        entityId: String(doc?.id),
        summary: 'Updated document',
        changes,
        meta: {
          documentTitle: doc?.title,
          documentCategory: doc?.category,
          version: doc?.version,
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
      action: 'doc.delete',
      entityType: 'document',
      entityId: String(doc?.id),
      summary: 'Deleted document',
      meta: {
        documentTitle: doc?.title,
        documentCategory: doc?.category,
        version: doc?.version,
        uploadedBy: normalizeRelId(doc?.uploadedBy),
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
    },
    {
      name: 'child',
      type: 'relationship',
      relationTo: 'children',
      required: true,
      index: true,
    },
    {
      name: 'file',
      label: 'File',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: [
        { label: 'Agreements', value: 'agreement' },
        { label: 'School', value: 'school' },
        { label: 'Health', value: 'health' },
        { label: 'ID / Identity', value: 'id' },
        { label: 'Other', value: 'other' },
      ],
      index: true,
    },
    {
      name: 'noteShort',
      type: 'text',
      required: false,
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      index: true,
    },
    {
      name: 'version',
      type: 'number',
      defaultValue: 1,
      required: true,
    },
    {
      name: 'replaces',
      type: 'relationship',
      relationTo: 'child_documents',
      required: false,
      admin: {
        description: 'If this document replaces an older one, link it here.',
      },
    },
  ],
}