'use client'

import { useState } from 'react'

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      style={{
        height: 40,
        padding: '0 14px',
        borderRadius: 999,
        border: '1px solid #d1d5db',
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      {copied ? 'Kopiert!' : 'Kopier'}
    </button>
  )
}
