import type { ReactNode } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import styles from './protectedLayout.module.css'
import ProtectedSidebar from '../components/ProtectedSidebar'
 
export const dynamic = 'force-dynamic'
 
async function getOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}
 
async function serverFetch(path: string) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
 
  const origin = await getOrigin()
 
  return fetch(`${origin}${path}`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  })
}
 
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