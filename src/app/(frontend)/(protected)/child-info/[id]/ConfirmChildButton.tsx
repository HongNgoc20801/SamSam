'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import styles from './childDetail.module.css'

function getId(v: any): string | null {
  if (!v) return null
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'object' && v?.id) return String(v.id)
  return null
}

export default function ConfirmChildButton({
  childId,
  status,
  lastEditedBy,
}: {
  childId: string
  status?: string
  lastEditedBy?: any
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [myId, setMyId] = useState<string | null>(null)
  const [meLoading, setMeLoading] = useState(true)

  const lastEditedById = useMemo(() => getId(lastEditedBy), [lastEditedBy])

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

  useEffect(() => {
    let ignore = false

    ;(async () => {
      try {
        setMeLoading(true)
        const id = await fetchMeId()
        if (!ignore) setMyId(id)
      } catch {
        if (!ignore) setMyId(null)
      } finally {
        if (!ignore) setMeLoading(false)
      }
    })()

    return () => {
      ignore = true
    }
  }, [])

  const canConfirm =
    status === 'pending' &&
    !!myId &&
    myId !== lastEditedById

  async function onConfirm() {
    setError('')
    setLoading(true)

    try {
      const currentUserId = myId ?? (await fetchMeId())
      if (!currentUserId) throw new Error('Missing current user id.')

      if (lastEditedById && currentUserId === lastEditedById) {
        throw new Error(
          'You cannot confirm a child profile that you last edited. The other parent must confirm it.',
        )
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

  if (status !== 'pending') return null

  const hint =
    myId && myId === lastEditedById
      ? 'You last edited this profile, so the other parent must confirm it.'
      : 'Review the profile and confirm that the information is correct.'

  return (
    <div className={styles.confirmCard}>
      <div className={styles.confirmCardTop}>
        <div className={styles.confirmIconWrap}>
          <ShieldCheck size={18} />
        </div>

        <div className={styles.confirmText}>
          <div className={styles.confirmTitle}>Confirm child profile</div>
          <div className={styles.confirmHint}>{hint}</div>
        </div>
      </div>

      <button
        type="button"
        className={styles.confirmBtn}
        onClick={onConfirm}
        disabled={loading || meLoading || !canConfirm}
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