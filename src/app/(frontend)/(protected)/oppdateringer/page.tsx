'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './oppdateringer.module.css'

type Child = {
  id: string | number
  fullName: string
}

type MeUser = {
  id: string | number
  firstName?: string
  lastName?: string
  email?: string
}

type PostType = 'general' | 'child-update'

type MediaDoc = {
  id: string | number
  url?: string
  filename?: string
  mimeType?: string
}

type CommentDoc = {
  author?: string | number | { id: string | number }
  authorName?: string
  content?: string
  createdAt?: string
}

type PostDoc = {
  id: string | number
  title?: string
  content: string
  type: PostType
  important?: boolean
  author?: string | number | { id: string | number }
  authorName?: string
  child?: string | number | { id: string | number; fullName?: string }
  attachments?: Array<string | number | MediaDoc>
  likes?: Array<string | number | { id: string | number }>
  comments?: CommentDoc[]
  createdAt?: string
}

function getId(v: any): string | null {
  if (!v) return null
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (typeof v === 'object' && v?.id !== undefined && v?.id !== null) return String(v.id)
  return null
}

function getChildName(v: any) {
  if (!v) return ''
  if (typeof v === 'object' && v?.fullName) return String(v.fullName)
  return ''
}

function fmtDateTime(v?: string) {
  if (!v) return '—'

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'

  return d.toLocaleString('nb-NO', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function normalizeMediaList(v: any): MediaDoc[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!item || typeof item !== 'object' || item.id === undefined || item.id === null) return null
      return {
        id: item.id,
        url: item.url || '',
        filename: item.filename || '',
        mimeType: item.mimeType || '',
      } as MediaDoc
    })
    .filter(Boolean) as MediaDoc[]
}

function normalizeComments(v: any): CommentDoc[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      return {
        author: item.author,
        authorName: item.authorName || '',
        content: item.content || '',
        createdAt: item.createdAt || '',
      } as CommentDoc
    })
    .filter(Boolean) as CommentDoc[]
}

export default function OppdateringerPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [me, setMe] = useState<MeUser | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [posts, setPosts] = useState<PostDoc[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [type, setType] = useState<PostType>('general')
  const [childId, setChildId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [important, setImportant] = useState(false)

  const [existingAttachments, setExistingAttachments] = useState<MediaDoc[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [viewerImages, setViewerImages] = useState<MediaDoc[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null)
  const [commentLoadingId, setCommentLoadingId] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  const myId = getId(me?.id)
  const viewerOpen = viewerImages.length > 0

  const childNameById = useMemo(() => {
    const m = new Map<string, string>()
    children.forEach((c) => m.set(String(c.id), c.fullName))
    return m
  }, [children])

  const filePreviews = useMemo(() => {
    return newFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }))
  }, [newFiles])

  useEffect(() => {
    return () => {
      filePreviews.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [filePreviews])

  useEffect(() => {
    if (!viewerOpen) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeViewer()
      } else if (e.key === 'ArrowLeft') {
        prevViewerImage()
      } else if (e.key === 'ArrowRight') {
        nextViewerImage()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewerOpen, viewerImages.length])

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-post-menu="true"]')) return
      setOpenMenuId(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const canSubmit = useMemo(() => {
    if (saving) return false
    if (!content.trim()) return false
    if (type === 'child-update' && !childId) return false
    return true
  }, [saving, content, type, childId])

  async function loadAll() {
    setLoading(true)
    setError('')

    try {
      const [meRes, childRes, postRes] = await Promise.all([
        fetch('/api/customers/me', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/children?limit=100&sort=createdAt', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/posts?limit=100&sort=-createdAt&depth=1', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])

      const meJson = await meRes.json().catch(() => null)
      const childJson = await childRes.json().catch(() => null)
      const postJson = await postRes.json().catch(() => null)

      if (!meRes.ok) {
        throw new Error(meJson?.message || `Could not load current user (${meRes.status})`)
      }

      if (!childRes.ok) {
        throw new Error(childJson?.message || `Could not load children (${childRes.status})`)
      }

      if (!postRes.ok) {
        throw new Error(postJson?.message || `Could not load posts (${postRes.status})`)
      }

      setMe(meJson?.user ?? meJson ?? null)
      setChildren(childJson?.docs ?? [])
      setPosts(postJson?.docs ?? [])
    } catch (err: any) {
      setError(err?.message || 'Could not load posts page.')
      setMe(null)
      setChildren([])
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  function resetForm() {
    setType('general')
    setChildId('')
    setTitle('')
    setContent('')
    setImportant(false)
    setExistingAttachments([])
    setNewFiles([])
    setEditingId(null)
    setModalMode('create')
  }

  function openCreateModal() {
    setError('')
    resetForm()
    setModalMode('create')
    setModalOpen(true)
  }

  function openEditModal(post: PostDoc) {
    setError('')
    setModalMode('edit')
    setEditingId(String(post.id))
    setType(post.type || 'general')
    setChildId(getId(post.child) || '')
    setTitle(post.title || '')
    setContent(post.content || '')
    setImportant(!!post.important)
    setExistingAttachments(normalizeMediaList(post.attachments))
    setNewFiles([])
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  function openViewer(images: MediaDoc[], index: number) {
    setViewerImages(images)
    setViewerIndex(index)
  }

  function closeViewer() {
    setViewerImages([])
    setViewerIndex(0)
  }

  function prevViewerImage() {
    setViewerIndex((prev) => {
      if (viewerImages.length <= 1) return prev
      return prev === 0 ? viewerImages.length - 1 : prev - 1
    })
  }

  function nextViewerImage() {
    setViewerIndex((prev) => {
      if (viewerImages.length <= 1) return prev
      return prev === viewerImages.length - 1 ? 0 : prev + 1
    })
  }

  async function uploadFiles(files: File[]) {
    const uploadedIds: Array<string | number> = []

    for (const file of files) {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })

      const raw = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || raw || 'Could not upload image.')
      }

      const mediaId = json?.id ?? json?.doc?.id
      if (!mediaId) {
        throw new Error('Image uploaded but media id was missing.')
      }

      uploadedIds.push(mediaId)
    }

    return uploadedIds
  }

  async function onSubmitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setError('')
    setSaving(true)

    try {
      const uploadedIds = await uploadFiles(newFiles)
      const existingIds = existingAttachments.map((a) => a.id)

      const body: any = {
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        important,
        attachments: [...existingIds, ...uploadedIds],
      }

      if (type === 'child-update') {
        body.child = childId
      } else {
        body.child = null
      }

      const isEdit = modalMode === 'edit' && editingId
      const url = isEdit ? `/api/posts/${editingId}` : '/api/posts'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const raw = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        throw new Error(
          json?.message ||
            json?.errors?.[0]?.message ||
            raw ||
            (isEdit ? 'Could not update post.' : 'Could not create post.'),
        )
      }

      closeModal()
      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not save post.')
    } finally {
      setSaving(false)
    }
  }

  async function onDeletePost(postId: string) {
    const ok = window.confirm('Are you sure you want to delete this post?')
    if (!ok) return

    setError('')
    setActionLoadingId(postId)

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const raw = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || raw || 'Could not delete post.')
      }

      if (editingId === postId) {
        closeModal()
      }

      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not delete post.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function onToggleLike(postId: string) {
    setError('')
    setLikeLoadingId(postId)

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      })

      const raw = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || raw || 'Could not toggle like.')
      }

      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not toggle like.')
    } finally {
      setLikeLoadingId(null)
    }
  }

  async function onAddComment(postId: string) {
    const value = (commentDrafts[postId] || '').trim()
    if (!value) return

    setError('')
    setCommentLoadingId(postId)

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value }),
      })

      const raw = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(raw)
      } catch {}

      if (!res.ok) {
        throw new Error(json?.message || raw || 'Could not add comment.')
      }

      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: '',
      }))

      await loadAll()
    } catch (err: any) {
      setError(err?.message || 'Could not add comment.')
    } finally {
      setCommentLoadingId(null)
    }
  }

  function renderGallery(images: MediaDoc[], postId: string) {
    const validImages = images.filter((img) => !!img.url)
    if (!validImages.length) return null

    const tile = (
      img: MediaDoc,
      idx: number,
      className: string,
      overlayText?: string,
    ) => (
      <button
        key={`${postId}-${String(img.id)}-${idx}`}
        type="button"
        className={`${styles.galleryTile} ${className}`}
        onClick={() => openViewer(validImages, idx)}
      >
        <img
          src={img.url}
          alt={img.filename || 'Post image'}
          className={styles.galleryImage}
        />
        {overlayText ? <div className={styles.galleryOverlay}>{overlayText}</div> : null}
      </button>
    )

    if (validImages.length === 1) {
      return (
        <div className={`${styles.gallery} ${styles.galleryOne}`}>
          {tile(validImages[0], 0, styles.gallerySingle)}
        </div>
      )
    }

    if (validImages.length === 2) {
      return (
        <div className={`${styles.gallery} ${styles.galleryTwo}`}>
          {tile(validImages[0], 0, styles.galleryTwoItem)}
          {tile(validImages[1], 1, styles.galleryTwoItem)}
        </div>
      )
    }

    if (validImages.length === 3) {
      return (
        <div className={`${styles.gallery} ${styles.galleryThree}`}>
          {tile(validImages[0], 0, styles.galleryThreeMain)}
          {tile(validImages[1], 1, styles.galleryThreeTop)}
          {tile(validImages[2], 2, styles.galleryThreeBottom)}
        </div>
      )
    }

    const extraCount = validImages.length - 4

    return (
      <div className={`${styles.gallery} ${styles.galleryFour}`}>
        {tile(validImages[0], 0, styles.galleryFourMain)}
        {tile(validImages[1], 1, styles.galleryFourTop)}
        {tile(validImages[2], 2, styles.galleryFourBottomLeft)}
        {tile(
          validImages[3],
          3,
          styles.galleryFourBottomRight,
          extraCount > 0 ? `+${extraCount}` : undefined,
        )}
      </div>
    )
  }

  if (loading) {
    return <div className={styles.loading}>Laster innlegg…</div>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Oppdateringer</h1>
          <p className={styles.subtitle}>
            Her ser du familiens innlegg og oppdateringer.
          </p>
        </div>

        <button type="button" className={styles.plusBtn} onClick={openCreateModal}>
          +
        </button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <section className={styles.feedCard}>
        <div className={styles.feedHeader}>
          <div className={styles.cardTitle}>Siste oppdateringer</div>
          <div className={styles.feedCount}>{posts.length} innlegg</div>
        </div>

        {posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <div className={styles.emptyTitle}>Ingen innlegg ennå</div>
            <div className={styles.emptyText}>
              Trykk på pluss-knappen for å opprette familiens første innlegg.
            </div>

            <button type="button" className={styles.emptyAction} onClick={openCreateModal}>
              + Nytt innlegg
            </button>
          </div>
        ) : (
          <div className={styles.feedList}>
            {posts.map((post) => {
              const postId = String(post.id)
              const authorId = getId(post.author)
              const isMine = myId && authorId ? myId === authorId : false
              const rawChildId = getId(post.child)
              const childName =
                (rawChildId ? childNameById.get(rawChildId) : '') || getChildName(post.child)

              const attachments = normalizeMediaList(post.attachments)
              const likes = Array.isArray(post.likes) ? post.likes : []
              const comments = normalizeComments(post.comments)
              const likedByMe = likes.some((x) => getId(x) === myId)

              return (
                <article key={postId} className={styles.postCard}>
                  <div className={styles.postTop}>
                    <div>
                      <div className={styles.postAuthorRow}>
                        <span className={styles.author}>{post.authorName || 'Unknown user'}</span>
                        {isMine ? <span className={styles.mineBadge}>You</span> : null}
                        {post.important ? <span className={styles.importantBadge}>Important</span> : null}
                      </div>

                      <div className={styles.postMeta}>
                        <span>{post.type === 'child-update' ? 'Child update' : 'General'}</span>
                        {childName ? (
                          <>
                            <span className={styles.dot}>•</span>
                            <span>{childName}</span>
                          </>
                        ) : null}
                        <span className={styles.dot}>•</span>
                        <span>{fmtDateTime(post.createdAt)}</span>
                      </div>
                    </div>

                    {isMine ? (
                      <div className={styles.postActions} data-post-menu="true">
                        <button
                          type="button"
                          className={styles.menuBtn}
                          aria-label="Post options"
                          onClick={() =>
                            setOpenMenuId((prev) => (prev === postId ? null : postId))
                          }
                        >
                          <span className={styles.menuDots} aria-hidden="true">
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                        </button>

                        {openMenuId === postId ? (
                          <div className={styles.menuDropdown}>
                            <button
                              type="button"
                              className={styles.menuItem}
                              onClick={() => {
                                setOpenMenuId(null)
                                openEditModal(post)
                              }}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className={`${styles.menuItem} ${styles.menuItemDanger}`}
                              onClick={() => {
                                setOpenMenuId(null)
                                onDeletePost(postId)
                              }}
                              disabled={actionLoadingId === postId}
                            >
                              {actionLoadingId === postId ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {post.title ? <h3 className={styles.postTitle}>{post.title}</h3> : null}
                  <div className={styles.postContent}>{post.content}</div>

                  {attachments.length > 0 ? renderGallery(attachments, postId) : null}

                  <div className={styles.engagementBar}>
                    <button
                      type="button"
                      className={`${styles.engagementBtn} ${likedByMe ? styles.engagementBtnActive : ''}`}
                      onClick={() => onToggleLike(postId)}
                      disabled={likeLoadingId === postId}
                    >
                      {likeLoadingId === postId
                        ? '...'
                        : likedByMe
                          ? `Likt (${likes.length})`
                          : `Lik (${likes.length})`}
                    </button>

                    <div className={styles.commentCount}>Kommentarer {comments.length}</div>
                  </div>

                  <div className={styles.commentSection}>
                    {comments.length === 0 ? (
                      <div className={styles.commentEmpty}>Ingen kommentarer ennå.</div>
                    ) : (
                      <div className={styles.commentList}>
                        {comments.map((comment, index) => (
                          <div key={`${postId}-comment-${index}`} className={styles.commentItem}>
                            <div className={styles.commentMeta}>
                              <span className={styles.commentAuthor}>
                                {comment.authorName || 'Unknown user'}
                              </span>
                              <span className={styles.dot}>•</span>
                              <span className={styles.commentTime}>
                                {fmtDateTime(comment.createdAt)}
                              </span>
                            </div>
                            <div className={styles.commentText}>{comment.content || ''}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.commentComposer}>
                      <input
                        className={styles.commentInput}
                        value={commentDrafts[postId] || ''}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [postId]: e.target.value,
                          }))
                        }
                        placeholder="Skriv en kommentar..."
                      />
                      <button
                        type="button"
                        className={styles.commentSubmit}
                        onClick={() => onAddComment(postId)}
                        disabled={commentLoadingId === postId || !(commentDrafts[postId] || '').trim()}
                      >
                        {commentLoadingId === postId ? 'Sender…' : 'Send'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className={styles.modalBackdrop} onMouseDown={closeModal}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                {modalMode === 'create' ? 'Nytt innlegg' : 'Rediger innlegg'}
              </div>

              <button type="button" className={styles.closeBtn} onClick={closeModal}>
                ✕
              </button>
            </div>

            <form className={styles.form} onSubmit={onSubmitPost}>
              <div className={styles.row}>
                <label className={styles.label}>
                  Type
                  <select
                    className={styles.select}
                    value={type}
                    onChange={(e) => {
                      const next = e.target.value as PostType
                      setType(next)
                      if (next === 'general') setChildId('')
                    }}
                    disabled={saving}
                  >
                    <option value="general">General update</option>
                    <option value="child-update">Child update</option>
                  </select>
                </label>

                {type === 'child-update' ? (
                  <label className={styles.label}>
                    Child
                    <select
                      className={styles.select}
                      value={childId}
                      onChange={(e) => setChildId(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">Velg barn…</option>
                      {children.map((child) => (
                        <option key={String(child.id)} value={String(child.id)}>
                          {child.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <label className={styles.label}>
                Title (optional)
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                  placeholder="Kort overskrift"
                  maxLength={120}
                />
              </label>

              <label className={styles.label}>
                Content
                <textarea
                  className={styles.textarea}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={saving}
                  placeholder="Skriv en familieoppdatering her…"
                  maxLength={5000}
                />
              </label>

              <label className={styles.label}>
                Images (optional)
                <input
                  className={styles.fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || [])
                    setNewFiles((prev) => [...prev, ...selected])
                  }}
                  disabled={saving}
                />
              </label>

              {existingAttachments.length > 0 ? (
                <div className={styles.attachmentBlock}>
                  <div className={styles.attachmentLabel}>Current images</div>
                  <div className={styles.uploadPreviewGrid}>
                    {existingAttachments.map((img) => (
                      <div key={String(img.id)} className={styles.uploadPreviewItem}>
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.filename || 'Existing image'}
                            className={styles.uploadPreviewImage}
                          />
                        ) : null}

                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() =>
                            setExistingAttachments((prev) =>
                              prev.filter((x) => String(x.id) !== String(img.id)),
                            )
                          }
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {filePreviews.length > 0 ? (
                <div className={styles.attachmentBlock}>
                  <div className={styles.attachmentLabel}>New images</div>
                  <div className={styles.uploadPreviewGrid}>
                    {filePreviews.map((img, index) => (
                      <div key={`${img.name}-${index}`} className={styles.uploadPreviewItem}>
                        <img src={img.url} alt={img.name} className={styles.uploadPreviewImage} />
                        <button
                          type="button"
                          className={styles.removeImageBtn}
                          onClick={() =>
                            setNewFiles((prev) => prev.filter((_, i) => i !== index))
                          }
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={important}
                  onChange={(e) => setImportant(e.target.checked)}
                  disabled={saving}
                />
                <span>Mark as important</span>
              </label>

              <div className={styles.modalActions}>
                {modalMode === 'edit' && editingId ? (
                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={() => onDeletePost(editingId)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button className={styles.primaryBtn} type="submit" disabled={!canSubmit}>
                  {saving
                    ? modalMode === 'create'
                      ? 'Publiserer…'
                      : 'Lagrer…'
                    : modalMode === 'create'
                      ? 'Publiser innlegg'
                      : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {viewerOpen ? (
        <div className={styles.viewerBackdrop} onMouseDown={closeViewer}>
          <div className={styles.viewerShell} onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className={styles.viewerClose} onClick={closeViewer}>
              ✕
            </button>

            {viewerImages.length > 1 ? (
              <button
                type="button"
                className={`${styles.viewerNav} ${styles.viewerPrev}`}
                onClick={prevViewerImage}
              >
                ‹
              </button>
            ) : null}

            <div className={styles.viewerStage}>
              <img
                src={viewerImages[viewerIndex]?.url || ''}
                alt={viewerImages[viewerIndex]?.filename || 'Viewer image'}
                className={styles.viewerImage}
              />
            </div>

            {viewerImages.length > 1 ? (
              <button
                type="button"
                className={`${styles.viewerNav} ${styles.viewerNext}`}
                onClick={nextViewerImage}
              >
                ›
              </button>
            ) : null}

            <div className={styles.viewerFooter}>
              <span>
                {viewerIndex + 1} / {viewerImages.length}
              </span>
              <span>{viewerImages[viewerIndex]?.filename || 'Image'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}