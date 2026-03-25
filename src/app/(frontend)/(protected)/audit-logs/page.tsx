import AuditLogList from '@/app/(frontend)/components/audit/AuditLogList'
import type { AuditLog } from '@/app/(frontend)/components/audit/auditTypes'
import { serverFetch } from '@/app/lib/serverFetch'
import styles from './auditLogsPage.module.css'

const AUDIT_SLUG = 'audit_logs'

export default async function AuditLogsPage() {
  const res = await serverFetch(`/api/${AUDIT_SLUG}?limit=100&sort=-createdAt`)
  const data = res.ok ? await res.json().catch(() => null) : null
  const audits: AuditLog[] = data?.docs ?? []

  return (
    <div className={styles.page}>
      <AuditLogList
        audits={audits}
        title="Historikk"
        compact={false}
        allowFilter={true}
        defaultImportantOnly={true}
      />
    </div>
  )
}