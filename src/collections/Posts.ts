import type { CollectionConfig, Where } from 'payload'
import { logAudit } from '@/app/lib/logAudit'
import { notifyFamily } from '@/app/lib/notifications/notifyFamily'

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

function normalizeRelArray(v: any): Array<string | number> {
  if (!Array.isArray(v)) return []

  return v
    .map((item) => normalizeRelId(item))
    .filter((item): item is string | number => item !== null)
}

function cleanText(v: any, max = 5000) {
  return String(v ?? '').trim().slice(0, max)
}

function normalizeCommentsArray(v: any) {
  if (!Array.isArray(v)) return []

  return v
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      return {
        author: normalizeRelId(item.author),
        authorName: cleanText(item.authorName, 120),
        content: cleanText(item.content, 2000),
        createdAt: item.createdAt || new Date().toISOString(),
      }
    })
    .filter(
      (
        item,
      ): item is {
        author: string | number | null
        authorName: string
        content: string
        createdAt: string
      } => !!item,
    )
}

function getFamilyIdFromUser(req: any) {
  const u: any = req?.user
  if (!u) return null
  return normalizeRelId(u.family)
}

function getFamilyIdFromDoc(doc: any) {
  return normalizeRelId(doc?.family)
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

function getRouteId(req: any) {
  return req?.routeParams?.id ?? req?.params?.id ?? null
}

async function getBody(req: any) {
  try {
    if (typeof req?.json === 'function') {
      return await req.json()
    }
  } catch {}

  return req?.body ?? req?.data ?? {}
}

function ensureCanAccessPost(req: any, post: any) {
  if (!req?.user) {
    throw new Error('Unauthorized.')
  }

  if (isAdmin(req)) return true

  if (!isCustomer(req)) {
    throw new Error('Only customers can access posts.')
  }

  const userFamilyId = getFamilyIdFromUser(req)
  const postFamilyId = getFamilyIdFromDoc(post)

  if (!userFamilyId || !postFamilyId || String(userFamilyId) !== String(postFamilyId)) {
    throw new Error('This post does not belong to your family.')
  }

  return true
}

function buildFullPostData(post: any, patch: any = {}) {
  return {
    family: normalizeRelId(post?.family),
    author: normalizeRelId(post?.author),
    authorName: cleanText(post?.authorName, 120),
    type: patch?.type ?? post?.type ?? 'general',
    child:
      patch && Object.prototype.hasOwnProperty.call(patch, 'child')
        ? normalizeRelId(patch.child)
        : normalizeRelId(post?.child),
    title:
      patch && Object.prototype.hasOwnProperty.call(patch, 'title')
        ? cleanText(patch.title, 120) || undefined
        : cleanText(post?.title, 120) || undefined,
    content: cleanText(
      patch && Object.prototype.hasOwnProperty.call(patch, 'content')
        ? patch.content
        : post?.content,
      5000,
    ),
    important:
      patch && Object.prototype.hasOwnProperty.call(patch, 'important')
        ? !!patch.important
        : !!post?.important,
    attachments:
      patch && Object.prototype.hasOwnProperty.call(patch, 'attachments')
        ? normalizeRelArray(patch.attachments)
        : normalizeRelArray(post?.attachments),
    likes:
      patch && Object.prototype.hasOwnProperty.call(patch, 'likes')
        ? normalizeRelArray(patch.likes)
        : normalizeRelArray(post?.likes),
    comments:
      patch && Object.prototype.hasOwnProperty.call(patch, 'comments')
        ? normalizeCommentsArray(patch.comments)
        : normalizeCommentsArray(post?.comments),
  }
}

async function getChildSnapshot(req: any, childValue: any) {
  const childId = normalizeRelId(childValue)

  if (!childId) {
    return {
      childId: null,
      childName: '',
    }
  }

  const childDoc = await req.payload
    .findByID({
      collection: 'children',
      id: childId,
      req,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)

  return {
    childId,
    childName: childDoc?.fullName || childDoc?.name || '',
  }
}

function getPostAuditLabel(post: any) {
  const title = cleanText(post?.title, 120)
  if (title) return title

  const content = cleanText(post?.content, 5000)
  if (!content) return 'Untitled post'

  return content.length > 60 ? `${content.slice(0, 60)}…` : content
}

async function buildPostAuditMeta(req: any, post: any) {
  const { childId, childName } = await getChildSnapshot(req, post?.child)
  const postLabel = getPostAuditLabel(post)
  const isChildUpdate = String(post?.type || '') === 'child-update'

  return {
    childId,
    childName,
    postLabel,
    isChildUpdate,
    meta: {
      title: postLabel,
      type: post?.type,
      important: !!post?.important,
      childId: childId || undefined,
      childName: childName || undefined,
      isChildUpdate,
      audienceLabel: isChildUpdate && childName ? `For ${childName}` : 'Family',
    },
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
        and: [{ family: { equals: familyId } }, { author: { equals: userId } }],
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
        and: [{ family: { equals: familyId } }, { author: { equals: userId } }],
      }

      return where
    },
  },

  endpoints: [
    {
      path: '/:id/like',
      method: 'post',
      handler: async (req: any) => {
        try {
          const postId = getRouteId(req)
          const userId = normalizeRelId(req?.user?.id)

          if (!postId) {
            return Response.json({ message: 'Missing post id.' }, { status: 400 })
          }

          if (!req?.user || !userId) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const post = await req.payload.findByID({
            collection: 'posts',
            id: postId,
            req,
            overrideAccess: true,
            depth: 0,
          })

          if (!post) {
            return Response.json({ message: 'Post not found.' }, { status: 404 })
          }

          ensureCanAccessPost(req, post)

          const currentLikes = normalizeRelArray(post?.likes)
          const hasLiked = currentLikes.some((id) => String(id) === String(userId))

          const nextLikes = hasLiked
            ? currentLikes.filter((id) => String(id) !== String(userId))
            : [...currentLikes, userId]

          const updated = await req.payload.update({
            collection: 'posts',
            id: postId,
            data: buildFullPostData(post, {
              likes: nextLikes,
            }),
            req,
            overrideAccess: true,
            depth: 0,
          })

          const { childId, childName, postLabel, meta } = await buildPostAuditMeta(req, updated)
          const familyId = getFamilyIdFromDoc(updated)

          await logAudit(req, {
            familyId,
            childId,
            childName,
            action: hasLiked ? 'post.unlike' : 'post.like',
            entityType: 'post',
            entityId: String(updated?.id),
            scope: 'other',
            severity: 'info',
            visibleInFamilyTimeline: false,
            relatedToRole: 'both',
            targetLabel: postLabel,
            summary: hasLiked ? 'Removed like from post' : 'Liked post',
            meta: {
              ...meta,
              actorName: getAuthorName(req),
            },
          })

          if (familyId && !hasLiked) {
            await notifyFamily(req, {
              familyId,
              actorUserId: userId,
              childId,
              type: 'post',
              event: 'liked',
              title: 'Post liked',
              message: postLabel,
              link: '/oppdateringer',
              meta: {
                ...meta,
                actorName: getAuthorName(req),
              },
            })
          }

          return Response.json({ ok: true, doc: updated })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not toggle like.' },
            { status: 400 },
          )
        }
      },
    },
    {
      path: '/:id/comments',
      method: 'post',
      handler: async (req: any) => {
        try {
          const postId = getRouteId(req)
          const userId = normalizeRelId(req?.user?.id)

          if (!postId) {
            return Response.json({ message: 'Missing post id.' }, { status: 400 })
          }

          if (!req?.user || !userId) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 })
          }

          const body = await getBody(req)
          const content = cleanText(body?.content, 2000)

          if (!content) {
            return Response.json({ message: 'Comment content is required.' }, { status: 400 })
          }

          const post = await req.payload.findByID({
            collection: 'posts',
            id: postId,
            req,
            overrideAccess: true,
            depth: 0,
          })

          if (!post) {
            return Response.json({ message: 'Post not found.' }, { status: 404 })
          }

          ensureCanAccessPost(req, post)

          const currentComments = normalizeCommentsArray(post?.comments)

          const nextComments = [
            ...currentComments,
            {
              author: userId,
              authorName: getAuthorName(req),
              content,
              createdAt: new Date().toISOString(),
            },
          ]

          const updated = await req.payload.update({
            collection: 'posts',
            id: postId,
            data: buildFullPostData(post, {
              comments: nextComments,
            }),
            req,
            overrideAccess: true,
            depth: 0,
          })

          const { childId, childName, postLabel, meta } = await buildPostAuditMeta(req, updated)
          const familyId = getFamilyIdFromDoc(updated)

          await logAudit(req, {
            familyId,
            childId,
            childName,
            action: 'post.comment.create',
            entityType: 'post',
            entityId: String(updated?.id),
            scope: 'other',
            severity: 'info',
            visibleInFamilyTimeline: false,
            relatedToRole: 'both',
            targetLabel: postLabel,
            summary: 'Added comment to post',
            meta: {
              ...meta,
              actorName: getAuthorName(req),
              commentLength: content.length,
            },
          })

          if (familyId) {
            await notifyFamily(req, {
              familyId,
              actorUserId: userId,
              childId,
              type: 'post',
              event: 'commented',
              title: 'New comment',
              message: postLabel,
              link: '/oppdateringer',
              meta: {
                ...meta,
                actorName: getAuthorName(req),
                commentLength: content.length,
              },
            })
          }

          return Response.json({ ok: true, doc: updated })
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not add comment.' },
            { status: 400 },
          )
        }
      },
    },
  ],

  hooks: {
    beforeValidate: [
      async (args: any) => {
        const { data, req, operation } = args
        const originalDoc = args?.originalDoc ?? args?.previousDoc ?? args?.doc ?? null

        const next: any = { ...(data ?? {}) }

        if (next.title !== undefined) next.title = cleanText(next.title, 120)
        if (next.content !== undefined) next.content = cleanText(next.content, 5000)

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
            child: finalChildId ?? null,
            content: resolvedContent,
            important: !!next.important,
            attachments: normalizeRelArray(next.attachments),
            likes: [],
            comments: [],
          }
        }

        if (operation === 'update') {
          return {
            ...next,
            family: normalizeRelId(originalDoc?.family) ?? currentFamilyId,
            author: normalizeRelId(originalDoc?.author) ?? userId,
            authorName: cleanText(originalDoc?.authorName ?? getAuthorName(req), 120),
            type: resolvedType === 'child-update' ? 'child-update' : 'general',
            child: finalChildId ?? (resolvedType === 'child-update' ? requestedChildId : null),
            title:
              'title' in next
                ? cleanText(next.title, 120) || undefined
                : cleanText(originalDoc?.title, 120) || undefined,
            content: resolvedContent,
            important: 'important' in next ? !!next.important : !!originalDoc?.important,
            attachments:
              'attachments' in next
                ? normalizeRelArray(next.attachments)
                : normalizeRelArray(originalDoc?.attachments),
            likes:
              'likes' in next
                ? normalizeRelArray(next.likes)
                : normalizeRelArray(originalDoc?.likes),
            comments:
              'comments' in next
                ? normalizeCommentsArray(next.comments)
                : normalizeCommentsArray(originalDoc?.comments),
          }
        }

        return next
      },
    ],

    afterChange: [
      async ({ doc, previousDoc, operation, req }: any) => {
        if (!req?.user || !doc) return

        const familyId = getFamilyIdFromDoc(doc)
        const actorUserId = normalizeRelId(req?.user?.id)
        const { childId, childName, postLabel, meta, isChildUpdate } =
          await buildPostAuditMeta(req, doc)

        if (operation === 'create') {
          await logAudit(req, {
            familyId,
            childId,
            childName,
            action: 'post.create',
            entityType: 'post',
            entityId: String(doc?.id),
            scope: 'other',
            severity: !!doc?.important ? 'important' : 'info',
            visibleInFamilyTimeline: true,
            relatedToRole: childId ? 'child' : 'both',
            targetLabel: postLabel,
            summary: isChildUpdate ? 'Created child update post' : 'Created family post',
            meta: {
              ...meta,
              actorName: getAuthorName(req),
            },
          })

          if (familyId) {
            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId,
              type: 'post',
              event: 'created',
              title: isChildUpdate ? 'New child update' : 'New family post',
              message: postLabel,
              link: '/oppdateringer',
              meta: {
                ...meta,
                actorName: getAuthorName(req),
              },
            })
          }

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

          if (!changes.length) return

          await logAudit(req, {
            familyId,
            childId,
            childName,
            action: 'post.update',
            entityType: 'post',
            entityId: String(doc?.id),
            scope: 'other',
            severity: !!doc?.important || !!previousDoc?.important ? 'important' : 'info',
            visibleInFamilyTimeline: true,
            relatedToRole: childId ? 'child' : 'both',
            targetLabel: postLabel,
            summary: isChildUpdate ? 'Updated child update post' : 'Updated family post',
            changes,
            meta: {
              ...meta,
              actorName: getAuthorName(req),
            },
          })

          if (familyId) {
            await notifyFamily(req, {
              familyId,
              actorUserId,
              childId,
              type: 'post',
              event: 'updated',
              title: 'Post updated',
              message: postLabel,
              link: '/oppdateringer',
              meta: {
                ...meta,
                actorName: getAuthorName(req),
              },
            })
          }
        }
      },
    ],

    afterDelete: [
      async ({ doc, req }: any) => {
        if (!req?.user || !doc) return

        const actorUserId = normalizeRelId(req?.user?.id)
        const { childId, childName, postLabel, meta, isChildUpdate } =
          await buildPostAuditMeta(req, doc)

        const familyId = getFamilyIdFromDoc(doc)

        await logAudit(req, {
          familyId,
          childId,
          childName,
          action: 'post.delete',
          entityType: 'post',
          entityId: String(doc?.id),
          scope: 'other',
          severity: !!doc?.important ? 'important' : 'info',
          visibleInFamilyTimeline: true,
          relatedToRole: childId ? 'child' : 'both',
          targetLabel: postLabel,
          summary: isChildUpdate ? 'Deleted child update post' : 'Deleted family post',
          meta: {
            ...meta,
            actorName: getAuthorName(req),
          },
        })

        if (familyId) {
          await notifyFamily(req, {
            familyId,
            actorUserId,
            childId,
            type: 'post',
            event: 'deleted',
            title: 'Post deleted',
            message: postLabel,
            link: '/oppdateringer',
            meta: {
              ...meta,
              actorName: getAuthorName(req),
            },
          })
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
    {
      name: 'likes',
      type: 'relationship',
      relationTo: 'customers',
      hasMany: true,
      required: false,
      defaultValue: [],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'comments',
      type: 'array',
      required: false,
      defaultValue: [],
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'customers',
          required: true,
        },
        {
          name: 'authorName',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
        },
        {
          name: 'createdAt',
          type: 'date',
          required: true,
        },
      ],
    },
  ],
}