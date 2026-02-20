import Link from 'next/link'
import { serverFetch } from '@/app/lib/serverFetch'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const cRes = await serverFetch('/api/children?limit=1')
  const cData = cRes.ok ? await cRes.json().catch(() => null) : null
  const hasChild = (cData?.docs?.length ?? 0) > 0

  if (!hasChild) {
    return (
      <div className={styles.wrapper}>
        <h1 className={styles.title}>Dashboard</h1>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Kom i gang</h2>
          <p className={styles.cardText}>
            Opprett en barneprofil for å kunne bruke kalender og økonomi.
          </p>

          <Link href="/child-info/new" className={styles.cta}>
            Opprett barneprofil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>hello</h1>
    </div>
  )
}
