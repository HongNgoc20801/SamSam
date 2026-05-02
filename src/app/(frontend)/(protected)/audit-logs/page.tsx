import AuditLogList from '@/app/(frontend)/components/audit/AuditLogList'
import type { AuditLog } from '@/app/(frontend)/components/audit/auditTypes'
import { serverFetch } from '@/app/lib/serverFetch'
import { getTranslations } from '@/app/lib/i18n/getTranslations'

import styles from './auditLogsPage.module.css'

const AUDIT_SLUG = 'audit_logs'
const CHILDREN_SLUG = 'children'

type ChildOption = {
  id: string | number
  fullName: string
}

type MediaValue =
  | string
  | {
      id?: string
      url?: string
      filename?: string
      alt?: string
    }

type FamilyMemberOption = {
  id?: string | number
  firstName?: string
  lastName?: string
  email?: string
  familyRole?: 'father' | 'mother' | 'sibling' | 'other'
  avatar?: MediaValue
}

type FamilyMember = string | FamilyMemberOption

type MeUser = FamilyMemberOption & {
  family?:
    | string
    | {
        id: string
        name?: string
        inviteCode?: string
        members?: FamilyMember[]
      }
}

function isMemberObject(member: FamilyMember): member is FamilyMemberOption {
  return typeof member === 'object' && member !== null
}

function getMemberKey(member: FamilyMemberOption) {
  return String(
    member.id ||
      member.email ||
      `${member.firstName || ''} ${member.lastName || ''}`.trim(),
  )
    .trim()
    .toLowerCase()
}

function addUniqueMember(list: FamilyMemberOption[], member?: FamilyMemberOption | null) {
  if (!member) return

  const key = getMemberKey(member)
  if (!key) return

  const exists = list.some((item) => getMemberKey(item) === key)
  if (!exists) list.push(member)
}

export default async function AuditLogsPage() {
  const t = await getTranslations()
  const td = t.auditLogsPage

  const [auditRes, childRes, meRes] = await Promise.all([
    serverFetch(`/api/${AUDIT_SLUG}?limit=100&sort=-createdAt`),
    serverFetch(`/api/${CHILDREN_SLUG}?limit=100&sort=fullName`),
    serverFetch('/api/customers/me'),
  ])

  const auditData = auditRes.ok ? await auditRes.json().catch(() => null) : null
  const childData = childRes.ok ? await childRes.json().catch(() => null) : null
  const meData = meRes.ok ? await meRes.json().catch(() => null) : null

  const audits: AuditLog[] = auditData?.docs ?? []
  const childOptions: ChildOption[] = childData?.docs ?? []
  const meUser: MeUser | null = meData?.user ?? meData ?? null
  const familyMembers: FamilyMemberOption[] = []

  addUniqueMember(familyMembers, meUser)

  const familyValue = meUser?.family
  const familyId = typeof familyValue === 'string' ? familyValue : familyValue?.id

  if (typeof familyValue === 'object' && Array.isArray(familyValue.members)) {
    familyValue.members.forEach((member) => {
      if (isMemberObject(member)) addUniqueMember(familyMembers, member)
    })
  }

  if (familyId) {
    const familyRes = await serverFetch(`/api/families/${familyId}?depth=1`)
    const familyData = familyRes.ok ? await familyRes.json().catch(() => null) : null

    if (Array.isArray(familyData?.members)) {
      familyData.members.forEach((member: FamilyMember) => {
        if (isMemberObject(member)) addUniqueMember(familyMembers, member)
      })
    }
  }

  return (
    <div className={styles.page}>
      <AuditLogList
        audits={audits}
        childOptions={childOptions}
        familyMembers={familyMembers}
        title={td.title}
        subtitle={td.subtitle}
        compact={false}
        allowFilter={true}
        defaultImportantOnly={false}
      />
    </div>
  )
}