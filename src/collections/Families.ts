import type { CollectionConfig } from 'payload'
import crypto from 'crypto'

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

function generateInviteCode(len = 10) {
  return crypto.randomBytes(32).toString('hex').slice(0, len).toUpperCase()
}

function getRelId(v: any) {
  if (v == null) return null
  if (typeof v === 'string' || typeof v === 'number') return v
  return v?.id ?? null
}

export const Families: CollectionConfig = {
  slug: 'families',

  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      return { members: { contains: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true
      return { members: { contains: req.user.id } }
    },
    delete: ({ req }) => isAdmin(req),
  },

  endpoints: [
    {
      path: '/join',
      method: 'post',
      handler: async (req: any) => {
        if (!req.user) return Response.json({ message: 'Unauthorized' }, { status: 401 })

        const slug = req.user?.collection ?? req.user?._collection
        if (slug !== 'customers') {
          return Response.json({ message: 'Only customers can join a family' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({} as any))
        const code = String(body?.code || '')
          .trim()
          .toUpperCase()

        if (!code) {
          return Response.json({ message: 'Missing invite code' }, { status: 400 })
        }

        const found = await req.payload.find({
          collection: 'families',
          where: { inviteCode: { equals: code } },
          limit: 1,
          overrideAccess: true,
        })

        const targetFamily = found.docs?.[0]
        if (!targetFamily) {
          return Response.json({ message: 'Invalid invite code' }, { status: 404 })
        }

        const userId = req.user.id
        const targetId = targetFamily.id

        const customer = await req.payload.findByID({
          collection: 'customers',
          id: userId,
          overrideAccess: true,
        })

        const oldFamilyId =
          typeof (customer as any).family === 'string'
            ? (customer as any).family
            : (customer as any).family?.id || null

        const currentMembers: string[] = Array.isArray((targetFamily as any).members)
          ? (targetFamily as any).members
              .map((m: any) => (typeof m === 'object' ? m?.id : m))
              .filter(Boolean)
          : []

        const updatedMembers = currentMembers.some((m) => String(m) === String(userId))
          ? currentMembers
          : [...currentMembers, userId]

        await req.payload.update({
          collection: 'families',
          id: targetId,
          data: { members: updatedMembers } as any,
          overrideAccess: true,
        })

        await req.payload.update({
          collection: 'customers',
          id: userId,
          data: { family: targetId } as any,
          overrideAccess: true,
        })

        if (oldFamilyId && String(oldFamilyId) !== String(targetId)) {
          const oldFamily = await req.payload
            .findByID({
              collection: 'families',
              id: oldFamilyId,
              overrideAccess: true,
            })
            .catch(() => null)

          if (oldFamily) {
            const oldMembers: string[] = Array.isArray((oldFamily as any).members)
              ? (oldFamily as any).members
                  .map((m: any) => (typeof m === 'object' ? m?.id : m))
                  .filter(Boolean)
              : []

            const onlyMe =
              oldMembers.length === 1 && String(oldMembers[0]) === String(userId)

            if (onlyMe) {
              await req.payload.delete({
                collection: 'families',
                id: oldFamilyId,
                overrideAccess: true,
              })
            }
          }
        }

        return Response.json({ ok: true, familyId: targetId }, { status: 200 })
      },
    },

    {
      path: '/me/members',
      method: 'get',
      handler: async (req: any) => {
        if (!req.user) {
          return Response.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (!isCustomer(req) && !isAdmin(req)) {
          return Response.json({ message: 'Forbidden' }, { status: 403 })
        }

        const familyId =
          typeof req.user.family === 'string' ? req.user.family : req.user.family?.id || null

        if (!familyId) {
          return Response.json({ docs: [] }, { status: 200 })
        }

        const family = await req.payload
          .findByID({
            collection: 'families',
            id: familyId,
            overrideAccess: true,
            depth: 0,
          })
          .catch(() => null)

        if (!family) {
          return Response.json({ docs: [] }, { status: 200 })
        }

        const memberIds = Array.isArray((family as any).members)
          ? (family as any).members
              .map((m: any) => (typeof m === 'object' ? m?.id : m))
              .filter(Boolean)
          : []

        const members = await Promise.all(
          memberIds.map((id: any) =>
            req.payload
              .findByID({
                collection: 'customers',
                id,
                overrideAccess: true,
                depth: 0,
              })
              .catch(() => null),
          ),
        )

        const docs = members
          .filter(Boolean)
          .map((m: any) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            familyRole: m.familyRole,
          }))

        return Response.json({ docs }, { status: 200 })
      },
    },
  ],

  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        const nextData: any = { ...(data ?? {}) }

        if (!nextData.inviteCode) nextData.inviteCode = generateInviteCode(10)

        if (
          req.user &&
          isCustomer(req) &&
          (!nextData.members ||
            (Array.isArray(nextData.members) && nextData.members.length === 0))
        ) {
          nextData.members = [req.user.id]
        }

        return nextData
      },
    ],
  },

  fields: [
    { name: 'name', label: 'Family name', type: 'text' },
    {
      name: 'inviteCode',
      label: 'Invite code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'members',
      label: 'Members',
      type: 'relationship',
      relationTo: 'customers',
      hasMany: true,
      required: true,
    },
  ],
}