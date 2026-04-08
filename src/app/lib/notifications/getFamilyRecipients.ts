function normalizeRelId(v: any): string | number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'object' && v?.id !== undefined && v?.id !== null) return v.id
  return null
}

export async function getFamilyRecipients(
  req: any,
  familyId: string | number,
  excludeUserId?: string | number | null,
) {
  const family = await req.payload
    .findByID({
      collection: 'families',
      id: familyId,
      req,
      overrideAccess: true,
      depth: 1,
    })
    .catch(() => null)

  if (!family) return []

  const members = Array.isArray(family?.members) ? family.members : []

  return members
    .map((m: any) => normalizeRelId(m))
    .filter(Boolean)
    .filter((id: any) => String(id) !== String(excludeUserId ?? ''))
}