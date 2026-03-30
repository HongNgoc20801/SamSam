'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './editProfile.module.css'

type MediaValue =
  | string
  | {
      id: string
      url?: string
      filename?: string
    }

type CustomerUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  birthDate?: string
  phone?: string
  address?: string
  gender?: 'male' | 'female' | 'other'
  familyRole?: 'father' | 'mother' | 'sibling' | 'other'
  avatar?: MediaValue
}

type CustomerMeResponse = {
  user?: CustomerUser
}

function isValidPhone(phone: string) {
  return /^[+\d\s]{6,}$/.test(phone.trim())
}

function labelGender(value?: string) {
  switch (value) {
    case 'male':
      return 'Male'
    case 'female':
      return 'Female'
    case 'other':
      return 'Other'
    default:
      return '-'
  }
}

function labelFamilyRole(value?: string) {
  switch (value) {
    case 'father':
      return 'Father'
    case 'mother':
      return 'Mother'
    case 'sibling':
      return 'Child'
    case 'other':
      return 'Other'
    default:
      return '-'
  }
}

function getMediaUrl(media?: MediaValue) {
  if (!media || typeof media === 'string') return ''
  return media.url || ''
}

function formatBirthDateForInput(value?: string) {
  if (!value) return ''
  return value.slice(0, 10)
}

function getInitials(firstName?: string, lastName?: string, email?: string) {
  const a = firstName?.trim()?.[0] ?? ''
  const b = lastName?.trim()?.[0] ?? ''
  const initials = `${a}${b}`.toUpperCase()
  if (initials) return initials
  return (email?.trim()?.[0] ?? 'U').toUpperCase()
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  )
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        {icon ? <span className={styles.sectionIcon}>{icon}</span> : null}
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function EditProfilePage() {
  const router = useRouter()

  const API_BASE = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PAYLOAD_URL
    const clean = base ? base.replace(/\/$/, '') : ''
    return clean ? `${clean}/api` : '/api'
  }, [])

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [familyRole, setFamilyRole] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [avatar, setAvatar] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/customers/me`, {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error('Could not load profile.')
        }

        const data: CustomerMeResponse = await res.json()
        const user = data?.user

        if (!user) {
          router.replace('/login')
          return
        }

        setUserId(String(user.id))
        setEmail(user.email || '')
        setBirthDate(user.birthDate || '')
        setFamilyRole(user.familyRole || '')
        setFirstName(user.firstName || '')
        setLastName(user.lastName || '')
        setPhone(user.phone || '')
        setAddress(user.address || '')
        setGender(user.gender || '')
        setAvatar(getMediaUrl(user.avatar))
      } catch (err: any) {
        setError(err?.message || 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    })()
  }, [API_BASE, router])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', 'Profile photo')

      const uploadRes = await fetch(`${API_BASE}/media`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const uploadData = await uploadRes.json().catch(() => null)

      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || 'Could not upload profile photo.')
      }

      const mediaId = uploadData?.doc?.id || uploadData?.id
      const mediaUrl = uploadData?.doc?.url || uploadData?.url || ''

      if (!mediaId) {
        throw new Error('Missing uploaded media id.')
      }

      const patchRes = await fetch(`${API_BASE}/customers/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: mediaId,
        }),
      })

      const patchData = await patchRes.json().catch(() => null)

      if (!patchRes.ok) {
        throw new Error(patchData?.message || 'Could not update profile photo.')
      }

      setAvatar(mediaUrl)
      setSuccess('Profile photo updated successfully.')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while uploading the image.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleRemoveAvatar() {
    if (!userId) return

    setError('')
    setSuccess('')
    setUploading(true)

    try {
      const res = await fetch(`${API_BASE}/customers/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: null,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || 'Could not remove profile photo.')
      }

      setAvatar('')
      setSuccess('Profile photo removed.')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    setError('')
    setSuccess('')

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !address.trim() || !gender) {
      setError('Please fill in all required fields.')
      return
    }

    if (!isValidPhone(phone)) {
      setError('Invalid phone number.')
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/customers/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          gender,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || data?.errors?.[0]?.message || 'Could not update profile.')
      }

      setSuccess('Profile updated successfully.')

      setTimeout(() => {
        router.push('/profile')
      }, 700)
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.sectionCard}>
            <p className={styles.loading}>Loading…</p>
          </section>
        </div>
      </main>
    )
  }

  const initials = getInitials(firstName, lastName, email)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <div>
            <p className={styles.breadcrumb}>Settings &nbsp;›&nbsp; Profile</p>
            <h1 className={styles.pageTitle}>Edit Profile</h1>
          </div>

          <div className={styles.topActions}>
            <button
              className={styles.cancelTopBtn}
              type="button"
              onClick={() => router.push('/profile')}
            >
              Cancel
            </button>

            <button
              className={styles.saveTopBtn}
              type="submit"
              form="edit-profile-form"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        <form id="edit-profile-form" className={styles.formLayout} onSubmit={handleSubmit}>
          <SectionCard title="Profile Photo">
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap}>
                {avatar ? (
                  <img className={styles.avatarImage} src={avatar} alt="Profile photo" />
                ) : (
                  <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
              </div>

              <div className={styles.avatarContent}>
                <h3 className={styles.avatarTitle}>Profile photo</h3>
                <p className={styles.avatarText}>
                  Updating your profile photo helps family members recognize you more easily.
                </p>

                <div className={styles.avatarActions}>
                  <label className={styles.linkUploadBtn}>
                    {uploading ? 'Uploading…' : 'Upload new photo'}
                    <input
                      className={styles.hiddenInput}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploading}
                    />
                  </label>

                  <button
                    className={styles.removeLinkBtn}
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploading || !avatar}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Basic Information" icon="👤">
            <div className={styles.grid}>
              <Field label="Last Name">
                <input
                  className={styles.input}
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </Field>

              <Field label="First Name">
                <input
                  className={styles.input}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </Field>
            </div>

            <div className={styles.grid}>
              <Field label="Date of Birth">
                <input
                  className={styles.inputDisabled}
                  type="text"
                  value={formatBirthDateForInput(birthDate)}
                  disabled
                />
              </Field>

              <Field label="Gender">
                <select
                  className={styles.input}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="male">{labelGender('male')}</option>
                  <option value="female">{labelGender('female')}</option>
                  <option value="other">{labelGender('other')}</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Contact & Address" icon="📩">
            <Field label="Email">
              <div className={styles.verifiedField}>
                <input className={styles.inputDisabled} type="text" value={email} disabled />
                <span className={styles.verifiedBadge}>Verified</span>
              </div>
            </Field>

            <Field label="Phone Number">
              <input
                className={styles.input}
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </Field>

            <Field label="Residential Address">
              <textarea
                className={styles.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address"
                rows={4}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Family Role" icon="👨‍👩‍👧">
            <Field label="Role in Family">
              <input
                className={styles.inputDisabled}
                type="text"
                value={labelFamilyRole(familyRole)}
                disabled
              />
            </Field>
          </SectionCard>

          <section className={styles.infoNote}>
            <div className={styles.infoNoteIcon}>i</div>
            <p className={styles.infoNoteText}>
              Your data is protected with secure handling standards. Changes to email or phone
              number may require additional verification for account safety.
            </p>
          </section>

          {success ? <p className={styles.success}>{success}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.bottomActions}>
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={() => router.push('/profile')}
            >
              Cancel
            </button>

            <button className={styles.primaryBtn} type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}