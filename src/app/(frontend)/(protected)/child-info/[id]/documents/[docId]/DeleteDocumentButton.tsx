'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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
  const t = useTranslations()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    const ok = window.confirm(t.documents.deleteConfirm)
    if (!ok) return

    try {
      setLoading(true)

      const res = await fetch(`/api/child_documents/${docId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(t.documents.deleteFailed)
      }

      router.push(`/child-info/${childId}/documents`)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(t.documents.deleteError)
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
      {loading ? t.documents.deleting : t.documents.deleteDocument}
    </button>
  )
}