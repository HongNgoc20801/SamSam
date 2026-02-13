import Link from 'next/link'
import { notFound } from 'next/navigation'
import { serverFetch } from '@/app/lib/serverFetch'
import styles from './childDetail.module.css'

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const res = await serverFetch(`/api/children/${id}`)
  if (!res.ok) return notFound()

  const child = await res.json().catch(() => null)
  if (!child?.id) return notFound()

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>{child.fullName}</h1>
        <span className={styles.status}>{child.status}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.metaRow}>
          <b>Fødselsdato:</b> {String(child.birthDate).slice(0, 10)}
        </div>
        <div className={styles.note}>Dette er delt informasjon i familiegruppen.</div>
      </div>

      <div className={styles.backRow}>
        <Link href="/child-info" className={styles.backLink}>
          ← Tilbake
        </Link>
      </div>
    </div>
  )
}
