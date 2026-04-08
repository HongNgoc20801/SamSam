import { createNotification } from './createNotification'
import { getFamilyRecipients } from './getFamilyRecipients'
import { shouldSendNotification } from './shouldSendNotification'
function normalizeRelId(v: any): string | number | null {
  if (v == null || v === '') return null
  if (typeof v === 'string' || typeof v === 'number') return v
  return v?.id ?? null
}

export async function notifyFamily(
  req: any,
  input: {
    familyId: string | number
    actorUserId?: string | number | null
    childId?: string | number | null
    type: 'calendar' | 'expense' | 'status' | 'documents'
    event:
  | 'created'
  | 'updated'
  | 'deleted'
  | 'confirmed'
  | 'commented'
  | 'liked'
  | 'uploaded'
  | 'replaced'
    title: string
    message?: string
    link?: string
    meta?: any
  },
) {
  const recipients = await getFamilyRecipients(req, input.familyId, input.actorUserId)

  for (const recipientId of recipients) {
    const user = await req.payload
      .findByID({
        collection: 'customers',
        id: recipientId,
        req,
        overrideAccess: true,
      })
      .catch(() => null)

    if (!shouldSendNotification(user, input.type)) continue

    await createNotification(req, {
      recipient: recipientId,
      family: input.familyId,
      child: normalizeRelId(input.childId),
      type: input.type,
      event: input.event,
      title: input.title,
      message: input.message,
      link: input.link,
      meta: input.meta,
    })
  }
}