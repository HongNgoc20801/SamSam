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

function normalizeRelId(v: any): string | number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const trimmed = v.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
  }

  if (typeof v === 'object' && v?.id != null) {
    return normalizeRelId(v.id)
  }

  return null
}

function generateInviteCode(len = 10) {
  return crypto.randomBytes(32).toString('hex').slice(0, len).toUpperCase()
}

function normalizeMembers(list: any[]) {
  if (!Array.isArray(list)) return []

  const seen = new Set<string>()

  return list
    .map((m: any) => normalizeRelId(typeof m === 'object' ? m?.id : m))
    .filter((v): v is string | number => v !== null)
    .filter((id) => {
      const key = String(id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

async function getFamilySummary(req: any, familyId: string | number | null) {
  if (!familyId) return null

  const family = await req.payload
    .findByID({
      collection: 'families',
      id: familyId,
      overrideAccess: true,
      depth: 0,
    })
    .catch(() => null)

  if (!family) return null

  const memberIds = normalizeMembers((family as any).members)

  return {
    id: normalizeRelId(family.id),
    name: String((family as any).name || 'Family'),
    inviteCode: String((family as any).inviteCode || ''),
    memberCount: memberIds.length,
  }
}

export const Families: CollectionConfig = {
  slug: 'families',

  access: {
    create: ({ req }) => !!req.user,

    read: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      return {
        members: {
          contains: req.user.id,
        },
      }
    },

    update: ({ req }) => {
      if (!req.user) return false
      if (isAdmin(req)) return true

      return {
        members: {
          contains: req.user.id,
        },
      }
    },

    delete: ({ req }) => isAdmin(req),
  },

  endpoints: [
    {
      path: '/join/preview',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can join a family.' },
              { status: 403 },
            )
          }

          const body = await req.json().catch(() => ({} as any))
          const code = String(body?.code || '').trim().toUpperCase()

          if (!code) {
            return Response.json({ message: 'Missing invite code.' }, { status: 400 })
          }

          const found = await req.payload.find({
            collection: 'families',
            where: {
              inviteCode: {
                equals: code,
              },
            },
            limit: 1,
            overrideAccess: true,
            depth: 0,
          })

          const targetFamily = found.docs?.[0]

          if (!targetFamily) {
            return Response.json({ message: 'Invalid invite code.' }, { status: 404 })
          }

          const userId = normalizeRelId(req.user.id)

          if (!userId) {
            return Response.json({ message: 'Invalid current user.' }, { status: 400 })
          }

          const customer = await req.payload.findByID({
            collection: 'customers',
            id: userId,
            overrideAccess: true,
            depth: 0,
          })

          const currentFamilyId = normalizeRelId((customer as any)?.family)
          const targetFamilyId = normalizeRelId(targetFamily.id)

          if (!targetFamilyId) {
            return Response.json({ message: 'Invalid target family.' }, { status: 400 })
          }

          const currentSummary = await getFamilySummary(req, currentFamilyId)
          const targetSummary = await getFamilySummary(req, targetFamilyId)

          const isSameFamily =
            !!currentFamilyId && String(currentFamilyId) === String(targetFamilyId)

          const willLeaveCurrentFamily = !!currentFamilyId && !isSameFamily

          return Response.json(
            {
              ok: true,
              code,
              alreadyMember: isSameFamily,
              isSameFamily,
              willLeaveCurrentFamily,
              currentFamily: currentSummary,
              targetFamily: targetSummary,
              warning: willLeaveCurrentFamily
                ? 'If you continue, you will leave your current family and join this family.'
                : '',
            },
            { status: 200 },
          )
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not preview family join.' },
            { status: 400 },
          )
        }
      },
    },

    {
      path: '/join',
      method: 'post',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req)) {
            return Response.json(
              { message: 'Only customers can join a family.' },
              { status: 403 },
            )
          }

          const body = await req.json().catch(() => ({} as any))
          const code = String(body?.code || '').trim().toUpperCase()
          const confirmJoin = body?.confirmJoin === true

          if (!code) {
            return Response.json({ message: 'Missing invite code.' }, { status: 400 })
          }

          const found = await req.payload.find({
            collection: 'families',
            where: {
              inviteCode: {
                equals: code,
              },
            },
            limit: 1,
            overrideAccess: true,
            depth: 0,
          })

          const targetFamily = found.docs?.[0]

          if (!targetFamily) {
            return Response.json({ message: 'Invalid invite code.' }, { status: 404 })
          }

          const userId = normalizeRelId(req.user.id)
          const targetFamilyId = normalizeRelId(targetFamily.id)

          if (!userId || !targetFamilyId) {
            return Response.json({ message: 'Invalid user or family id.' }, { status: 400 })
          }

          const customer = await req.payload.findByID({
            collection: 'customers',
            id: userId,
            overrideAccess: true,
            depth: 0,
          })

          const oldFamilyId = normalizeRelId((customer as any)?.family)

          const isSameFamily =
            !!oldFamilyId && String(oldFamilyId) === String(targetFamilyId)

          if (isSameFamily) {
            return Response.json(
              {
                ok: true,
                familyId: targetFamilyId,
                alreadyMember: true,
                message: 'You are already in this family.',
              },
              { status: 200 },
            )
          }

          const isSwitchingFamily =
            !!oldFamilyId && String(oldFamilyId) !== String(targetFamilyId)

          if (isSwitchingFamily && !confirmJoin) {
            return Response.json(
              {
                message:
                  'Joining this family will remove you from your current family. Please confirm before continuing.',
                requiresConfirmation: true,
              },
              { status: 409 },
            )
          }

          if (oldFamilyId) {
            const oldFamily = await req.payload
              .findByID({
                collection: 'families',
                id: oldFamilyId,
                overrideAccess: true,
                depth: 0,
              })
              .catch(() => null)

            if (oldFamily) {
              const oldMembers = normalizeMembers((oldFamily as any).members)
              const nextOldMembers = oldMembers.filter(
                (memberId) => String(memberId) !== String(userId),
              )

              if (nextOldMembers.length === 0) {
                await req.payload.delete({
                  collection: 'families',
                  id: oldFamilyId,
                  overrideAccess: true,
                })
              } else {
                await req.payload.update({
                  collection: 'families',
                  id: oldFamilyId,
                  data: {
                    members: nextOldMembers,
                  } as any,
                  overrideAccess: true,
                })
              }
            }
          }

          const freshTargetFamily = await req.payload.findByID({
            collection: 'families',
            id: targetFamilyId,
            overrideAccess: true,
            depth: 0,
          })

          const targetMembers = normalizeMembers((freshTargetFamily as any).members)

          const nextTargetMembers = targetMembers.some(
            (memberId) => String(memberId) === String(userId),
          )
            ? targetMembers
            : [...targetMembers, userId]

          await req.payload.update({
            collection: 'families',
            id: targetFamilyId,
            data: {
              members: nextTargetMembers,
            } as any,
            overrideAccess: true,
          })

          await req.payload.update({
            collection: 'customers',
            id: userId,
            data: {
              family: targetFamilyId,
            } as any,
            overrideAccess: true,
          })

          return Response.json(
            {
              ok: true,
              familyId: targetFamilyId,
            },
            { status: 200 },
          )
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not join family.' },
            { status: 400 },
          )
        }
      },
    },

    {
      path: '/me/members',
      method: 'get',
      handler: async (req: any) => {
        try {
          if (!req.user) {
            return Response.json({ message: 'Unauthorized' }, { status: 401 })
          }

          if (!isCustomer(req) && !isAdmin(req)) {
            return Response.json({ message: 'Forbidden' }, { status: 403 })
          }

          const userId = normalizeRelId(req.user.id)

          if (!userId) {
            return Response.json({ docs: [] }, { status: 200 })
          }

          const customer = await req.payload.findByID({
            collection: 'customers',
            id: userId,
            overrideAccess: true,
            depth: 0,
          })

          const familyId = normalizeRelId((customer as any)?.family)

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

          const memberIds = normalizeMembers((family as any).members)

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
        } catch (error: any) {
          return Response.json(
            { message: error?.message || 'Could not load family members.' },
            { status: 400 },
          )
        }
      },
    },
  ],

  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        const nextData: any = { ...(data ?? {}) }

        if (!nextData.inviteCode) {
          nextData.inviteCode = generateInviteCode(10)
        }

        if (
          req.user &&
          isCustomer(req) &&
          (!nextData.members ||
            (Array.isArray(nextData.members) && nextData.members.length === 0))
        ) {
          const currentUserId = normalizeRelId(req.user.id)
          nextData.members = currentUserId ? [currentUserId] : []
        }

        if (Array.isArray(nextData.members)) {
          nextData.members = normalizeMembers(nextData.members)
        }

        return nextData
      },
    ],
  },

  fields: [
    {
      name: 'name',
      label: 'Family name',
      type: 'text',
    },
    {
      name: 'inviteCode',
      label: 'Invite code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
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