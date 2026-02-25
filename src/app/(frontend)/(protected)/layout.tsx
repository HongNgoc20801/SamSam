import type { ReactNode } from 'react'
//import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import styles from './protectedLayout.module.css'
import ProtectedSidebar from '../components/ProtectedSidebar'
import { serverFetch } from '../../lib/serverFetch' 
import 'react-big-calendar/lib/css/react-big-calendar.css'

 
export const dynamic = 'force-dynamic'
 
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  // ✅ đổi users -> customers
  const meRes = await serverFetch('/api/customers/me')
 
  if (!meRes.ok) {
    // ✅ chưa login thì đá về login
    redirect('/login')
  }
 
  const meData = await meRes.json().catch(() => null)
  const user = meData?.user ?? null
 
  if (!user?.id) {
    redirect('/login')
  }
 
  let inviteCode: string | null = null
  if (user?.family) {
    const familyId = typeof user.family === 'string' ? user.family : user.family?.id
    if (familyId) {
      const famRes = await serverFetch(`/api/families/${familyId}`)
      const famData = famRes.ok ? await famRes.json().catch(() => null) : null
      inviteCode = famData?.inviteCode ?? null
    }
  }
 
  return (
    <div className={styles.shell}>
      <ProtectedSidebar user={user} inviteCode={inviteCode} />
      <main className={styles.main}>{children}</main>
    </div>
  )
}