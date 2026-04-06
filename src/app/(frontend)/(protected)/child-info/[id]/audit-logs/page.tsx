import Link from 'next/link'
import { notFound } from 'next/navigation'

import AuditLogList from '@/app/(frontend)/components/audit/AuditLogList'
import type { AuditLog } from '@/app/(frontend)/components/audit/auditTypes'
import { serverFetch } from '@/app/lib/serverFetch'
import { getTranslations } from '@/app/lib/i18n/getTranslations'

import styles from './childAuditLogsPage.module.css'

const AUDIT_SLUG = 'audit_logs'

type Child = {
  id: string
  fullName: string
}

export default async function ChildAuditLogsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const t = await getTranslations()
  const td = t.childAuditLogsPage

  const { id } = await params

  const [childRes, auditRes] = await Promise.all([
    serverFetch(`/api/children/${id}?depth=0`),
    serverFetch(
      `/api/${AUDIT_SLUG}?limit=100&sort=-createdAt&where[child][equals]=${id}&where[visibleInFamilyTimeline][equals]=true`,
    ),
  ])

  if (!childRes.ok) return notFound()

  const child: Child | null = await childRes.json().catch(() => null)
  if (!child?.id) return notFound()

  const auditData = auditRes.ok ? await auditRes.json().catch(() => null) : null
  const audits: AuditLog[] = auditData?.docs ?? []

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href={`/child-info/${id}`} className={styles.backLink}>
          ← {td.back}
        </Link>
      </div>

      <AuditLogList
        audits={audits}
        title={td.title}
        subtitle={`${td.subtitle} ${child.fullName}.`}
        compact={false}
        allowFilter={true}
        defaultImportantOnly={true}
      />
    </div>
  )
}