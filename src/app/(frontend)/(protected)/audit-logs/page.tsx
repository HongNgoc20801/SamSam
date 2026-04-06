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

export default async function AuditLogsPage() {
  const t = await getTranslations()
  const td = t.auditLogsPage

  const [auditRes, childRes] = await Promise.all([
    serverFetch(`/api/${AUDIT_SLUG}?limit=100&sort=-createdAt`),
    serverFetch(`/api/${CHILDREN_SLUG}?limit=100&sort=fullName`),
  ])

  const auditData = auditRes.ok ? await auditRes.json().catch(() => null) : null
  const childData = childRes.ok ? await childRes.json().catch(() => null) : null

  const audits: AuditLog[] = auditData?.docs ?? []
  const children: ChildOption[] = childData?.docs ?? []

  return (
    <div className={styles.page}>
      <AuditLogList
        audits={audits}
        children={children}
        title={td.title}
        compact={false}
        allowFilter={true}
        defaultImportantOnly={false}
      />
    </div>
  )
}