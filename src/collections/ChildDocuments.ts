import type { CollectionConfig, Where } from 'payload'
import { logAudit } from '@/app/lib/logAudit'
import { notifyFamily } from '@/app/lib/notifications/notifyFamily'

type ProfileStatus = 'active' | 'inactive' | 'archived'

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

function getFamilyIdFromDoc(doc: any) {
  return typeof doc?.family === 'string' ? doc.family : doc?.family?.id ?? null
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

function normalizeProfileStatus(v: any): ProfileStatus {
  if (v === 'inactive') return 'inactive'
  if (v === 'archived') return 'archived'
  return 'active'
}

function asText(v: any) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v)
  }

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

function getActorDisplayName(req: any) {
  const u: any = req?.user
  if (!u) return 'A parent'

  const firstName = cleanText(u?.firstName ?? u?.fornavn ?? '', 80)
  if (firstName) return firstName

  const combined = `${cleanText(u?.firstName ?? u?.fornavn ?? '', 80)} ${cleanText(
    u?.lastName ?? u?.etternavn ?? '',
    80,
  )}`.trim()
  if (combined) return combined

  const fullName = cleanText(u?.fullName ?? u?.name ?? u?.displayName ?? '', 120)
  if (fullName) return fullName

  const email = cleanText(u?.email ?? '', 120)
  if (email) return email

  return 'Family member'
}

async function getChildById(req: any, childValue: any) {
  const childId = normalizeRelId(childValue)

  if (!childId) {
    throw new Error('Missing child.')
  }

  const childDoc = await req.payload.findByID({
    collection: 'children',
    id: childId,
    req,
    overrideAccess: true,
  })

  if (!childDoc?.id) {
    throw new Error('Child not found.')
  }

  return childDoc
}

async function assertChildIsWritable(req: any, childValue: any) {
  const childDoc = await getChildById(req, childValue)

  if (normalizeProfileStatus(childDoc?.profileStatus) === 'archived') {
    throw new Error('Archived child profiles are read-only. Documents cannot be changed.')
  }

  return childDoc
}

async function getChildSnapshot(req: any, childValue: any) {
  const childId = normalizeRelId(childValue)

  if (!childId) {
    return {
      childId: null,
      childName: undefined,
    }
  }

  try {
    const childDoc = await req.payload.findByID({
      collection: 'children',
      id: childId,
      req,
      overrideAccess: true,
    })

    return {
      childId,
      childName: childDoc?.fullName || childDoc?.name || undefined,
    }
  } catch {
    return {
      childId,
      childName: undefined,
    }
  }
}

function getFileNameFromDocFile(fileValue: any) {
  if (!fileValue) return undefined
  if (typeof fileValue === 'object') {
    return fileValue?.filename || fileValue?.name || undefined
  }
  return undefined
}

function getChildDocumentsLink(childId: string | number | null) {
  if (!childId) return '/child-info'
  return `/child-info/${childId}/documents`
}

function getDocumentCategoryLabel(category?: string) {
  switch (String(category || 'other')) {
    case 'agreement':
      return 'agreement'
    case 'school':
      return 'school'
    case 'health':
      return 'health'
    case 'id':
      return 'ID'
    default:
      return 'document'
  }
}

export const ChildDocuments: CollectionConfig = {
  slug: 'child_documents',

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'version', 'uploadedByName', 'updatedAt'],
  },

  access: {
    create: ({ req }) => !!req.user && isCustomer(req),

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return {
        family: { equals: familyId },
      }
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      if (!familyId) return false

      return {
        family: { equals: familyId },
      }
    },

    delete: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      if (!isCustomer(req)) return false

      const familyId = getFamilyIdFromUser(req)
      const userId = normalizeRelId((req.user as any)?.id)

      if (!familyId || !userId) return false

      const where: Where = {
        and: [{ family: { equals: familyId } }, { uploadedBy: { equals: userId } }],
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
          const user: any = req?.user

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

          const childDoc = await assertChildIsWritable(req, childId)

          const childFamilyId =
            typeof childDoc.family === 'string' ? childDoc.family : childDoc.family?.id ?? null

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
            const replacesId = normalizeRelId(next.replaces)

            if (!replacesId) {
              throw new Error('Invalid document to replace.')
            }

            const prev = await req.payload.findByID({
              collection: 'child_documents',
              id: replacesId,
              req,
              overrideAccess: true,
            })

            if (!prev?.id) {
              throw new Error('Document to replace was not found.')
            }

            if (normalizeRelId(prev?.child) !== childId) {
              throw new Error('You can only replace a document for the same child.')
            }

            if (getFamilyIdFromDoc(prev) !== familyId) {
              throw new Error('You do not have permission to replace this document.')
            }

            version = Number(prev?.version || 1) + 1
          }

          const uploadedByName =
            cleanText(
              user?.firstName ??
                user?.fornavn ??
                user?.fullName ??
                user?.name ??
                user?.displayName ??
                user?.email ??
                'Family member',
              120,
            ) || 'Family member'

          return {
            ...next,
            family: familyId,
            uploadedBy: userId,
            uploadedByName,
            child: childId,
            file: mediaId,
            version,
          }
        }

        if (operation === 'update') {
          if (!oldDoc?.id) {
            throw new Error('Original document not found.')
          }

          await assertChildIsWritable(req, oldDoc.child)

          next.family = oldDoc.family
          next.uploadedBy = oldDoc.uploadedBy
          next.uploadedByName = oldDoc.uploadedByName
          next.version = oldDoc.version
          next.child = oldDoc.child
          next.file = oldDoc.file
          next.replaces = oldDoc.replaces

          if (data && 'child' in data && normalizeRelId(data.child) !== normalizeRelId(oldDoc?.child)) {
            throw new Error('Changing child is not allowed.')
          }

          if (data && 'file' in data && normalizeRelId(data.file) !== normalizeRelId(oldDoc?.file)) {
            throw new Error('Changing file is not allowed. Upload a new document instead.')
          }

          if (
            data &&
            'replaces' in data &&
            normalizeRelId(data.replaces) !== normalizeRelId(oldDoc?.replaces)
          ) {
            throw new Error(
              'To replace a document, create a new document with replaces=<oldDocId>.',
            )
          }

          return next
        }

        return next
      },
    ],

    beforeDelete: [
      async ({ req, id }: any) => {
        if (!req?.user || !id) return

        const existingDoc = await req.payload.findByID({
          collection: 'child_documents',
          id,
          req,
          overrideAccess: true,
        })

        if (!existingDoc?.id) return

        await assertChildIsWritable(req, existingDoc.child)
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getFamilyIdFromDoc(doc)
        const actorUserId = normalizeRelId(req?.user?.id)
        const actorName = getActorDisplayName(req)
        const { childId, childName } = await getChildSnapshot(req, doc?.child)
        const documentLink = getChildDocumentsLink(childId)
        const categoryLabel = getDocumentCategoryLabel(doc?.category)

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId,
            childName,
            action: doc?.replaces ? 'doc.replace' : 'doc.upload',
            entityType: 'document',
            entityId: String(doc?.id),
            scope: 'documents',
            severity: 'important',
            relatedToRole: 'both',
            targetLabel: doc?.title,
            summary: doc?.replaces
              ? `${actorName} replaced ${categoryLabel} document for ${childName || 'this child'}`
              : `${actorName} uploaded ${categoryLabel} document for ${childName || 'this child'}`,
            meta: {
              actorName,
              childId,
              childName,
              documentTitle: doc?.title,
              documentCategory: doc?.category,
              version: doc?.version ?? 1,
              fileName: getFileNameFromDocFile(doc?.file),
              replaces: normalizeRelId(doc?.replaces),
              eventType: 'child-document',
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'documents',
            event: doc?.replaces ? 'replaced' : 'uploaded',
            title: doc?.replaces
              ? `Document replaced for ${childName || 'child'}`
              : `Document uploaded for ${childName || 'child'}`,
            message: doc?.replaces
              ? `${actorName} replaced "${doc?.title || 'a document'}".`
              : `${actorName} uploaded "${doc?.title || 'a document'}".`,
            link: documentLink,
            meta: {
              actorName,
              childId,
              childName,
              documentTitle: doc?.title,
              documentCategory: doc?.category,
              version: doc?.version,
              fileName: getFileNameFromDocFile(doc?.file),
              eventType: 'child-document',
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
            childName,
            action: 'doc.update',
            entityType: 'document',
            entityId: String(doc?.id),
            scope: 'documents',
            severity: 'important',
            relatedToRole: 'both',
            targetLabel: doc?.title,
            summary: `${actorName} updated document for ${childName || 'this child'}`,
            changes,
            meta: {
              actorName,
              childId,
              childName,
              documentTitle: doc?.title,
              documentCategory: doc?.category,
              version: doc?.version ?? 1,
              changedFields: changes.map((c) => c.field),
              eventType: 'child-document',
            },
          })

          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'documents',
            event: 'updated',
            title: `Document updated for ${childName || 'child'}`,
            message: `${actorName} updated "${doc?.title || 'a document'}".`,
            link: documentLink,
            meta: {
              actorName,
              childId,
              childName,
              documentTitle: doc?.title,
              documentCategory: doc?.category,
              version: doc?.version,
              changedFields: changes.map((c) => c.field),
              eventType: 'child-document',
            },
          })
        }
      },
    ],

    afterDelete: [
      async ({ doc, req }: any) => {
        if (!req?.user || !doc) return

        const actorUserId = normalizeRelId(req?.user?.id)
        const actorName = getActorDisplayName(req)
        const { childId, childName } = await getChildSnapshot(req, doc?.child)
        const familyId = getFamilyIdFromDoc(doc)
        const documentLink = getChildDocumentsLink(childId)

        await logAudit(req, {
          familyId,
          childId,
          childName,
          action: 'doc.delete',
          entityType: 'document',
          entityId: String(doc?.id),
          scope: 'documents',
          severity: 'important',
          relatedToRole: 'both',
          targetLabel: doc?.title,
          summary: `${actorName} deleted document for ${childName || 'this child'}`,
          meta: {
            actorName,
            childId,
            childName,
            documentTitle: doc?.title,
            documentCategory: doc?.category,
            version: doc?.version ?? 1,
            eventType: 'child-document',
          },
        })

        await notifyFamily(req, {
          familyId,
          actorUserId,
          childId,
          type: 'documents',
          event: 'deleted',
          title: `Document deleted for ${childName || 'child'}`,
          message: `${actorName} deleted "${doc?.title || 'a document'}".`,
          link: documentLink,
          meta: {
            actorName,
            childId,
            childName,
            documentTitle: doc?.title,
            documentCategory: doc?.category,
            version: doc?.version,
            eventType: 'child-document',
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
      name: 'uploadedByName',
      type: 'text',
      required: false,
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