'use client'

import { useMemo, useState } from 'react'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import styles from './childDetail.module.css'

function getId(v: any): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v?.id) return String(v.id)
  return null
}

export default function ConfirmChildButton({
  childId,
  status,
  createdBy,
}: {
  childId: string
  status?: string
  createdBy?: any
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createdById = useMemo(() => getId(createdBy), [createdBy])

  const canConfirm = status === 'pending'

  async function fetchMeId(): Promise<string | null> {
    const res = await fetch('/api/customers/me', {
      credentials: 'include',
      cache: 'no-store',
    })

    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.message || `Could not load current user (${res.status})`)

    const me = j?.user ?? j
    return getId(me?.id) ?? getId(me)
  }

  async function onConfirm() {
    setError('')
    setLoading(true)

    try {
      const myId = await fetchMeId()
      if (!myId) throw new Error('Missing current user id.')

      if (createdById && myId === createdById) {
        throw new Error('You cannot confirm a child profile that you created. The other parent must confirm it.')
      }

      const res = await fetch(`/api/children/${childId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message || `Could not confirm (${res.status}).`)

      window.location.reload()
    } catch (e: any) {
      setError(e?.message || 'Could not confirm.')
    } finally {
      setLoading(false)
    }
  }

  if (!canConfirm) return null

  return (
    <div className={styles.confirmCard}>
      <div className={styles.confirmCardTop}>
        <div className={styles.confirmIconWrap}>
          <ShieldCheck size={18} />
        </div>

        <div className={styles.confirmText}>
          <div className={styles.confirmTitle}>Confirm child profile</div>
          <div className={styles.confirmHint}>
            Review the profile and confirm that the information is correct.
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.confirmBtn}
        onClick={onConfirm}
        disabled={loading}
        aria-label="Confirm child profile"
      >
        {loading ? (
          <>
            <Loader2 size={16} className={styles.spin} />
            Confirming...
          </>
        ) : (
          <>
            <ShieldCheck size={16} />
            Confirm profile
          </>
        )}
      </button>

      {error ? (
        <div className={styles.confirmError}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
}