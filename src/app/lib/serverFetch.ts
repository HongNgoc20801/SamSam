import { cookies, headers } from 'next/headers'

async function getOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export async function serverFetch(path: string) {
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
