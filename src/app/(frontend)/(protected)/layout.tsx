import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import styles from './protectedLayout.module.css'
import ProtectedSidebar from '../components/ProtectedSidebar'
import { serverFetch } from '../../lib/serverFetch'
import { SettingsProvider } from '../components/providers/SettingsProvider'
import { getCurrentSettings } from '../../lib/settings/getCurrentSettings'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const meRes = await serverFetch('/api/customers/me')

  if (!meRes.ok) {
    redirect('/login')
  }

  const meData = await meRes.json().catch(() => null)
  const user = meData?.user ?? null

  if (!user?.id) {
    redirect('/login')
  }

  const initialSettings = await getCurrentSettings()

  return (
    <SettingsProvider initialSettings={initialSettings}>
      <div className={styles.shell}>
        <ProtectedSidebar user={user} />
        <main className={styles.main}>{children}</main>
      </div>
    </SettingsProvider>
  )
}