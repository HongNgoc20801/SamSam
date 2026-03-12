'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type Props = {
  docId: string
  childId: string
  className?: string
}

export default function DeleteDocumentButton({
  docId,
  childId,
  className,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    const ok = window.confirm(
      'Are you sure you want to delete this document? This action cannot be undone.'
    )
    if (!ok) return

    try {
      setLoading(true)

      const res = await fetch(`/api/child_documents/${docId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete document')
      }

      router.push(`/child-info/${childId}/documents`)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Delete failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 size={16} />
      {loading ? 'Deleting...' : 'Delete document'}
    </button>
  )
}