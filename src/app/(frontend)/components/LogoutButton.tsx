'use client'

import { useRouter } from 'next/navigation'

const AUTH_COLLECTION = 'customers' 

export default function LogoutButton() {
  const router = useRouter()

  const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    ? `${process.env.NEXT_PUBLIC_PAYLOAD_URL}`
    : ''

  async function handleLogout() {
    try {
      await fetch(`${base}/api/${AUTH_COLLECTION}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
     
      localStorage.removeItem('samsam_remember')
      localStorage.removeItem('samsam_email')
      localStorage.removeItem('samsam_password')

      router.push('/login')
      router.refresh()
    }
  }

  return (
    <button onClick={handleLogout} style={{ cursor: 'pointer' }}>
      Logg ut
    </button>
  )
}
