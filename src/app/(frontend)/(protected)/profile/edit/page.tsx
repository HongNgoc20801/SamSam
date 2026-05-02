'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import styles from './editProfile.module.css'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

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
  language?: 'no' | 'en'
}

type CustomerMeResponse = {
  user?: CustomerUser
}

function isValidPhone(phone: string) {
  return /^[+\d\s]{6,}$/.test(phone.trim())
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
  const t = useTranslations()
  const td = t.editProfilePage

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

  function labelGender(value?: string) {
    switch (value) {
      case 'male':
        return td.genderMale
      case 'female':
        return td.genderFemale
      case 'other':
        return td.genderOther
      default:
        return td.noValue
    }
  }

  function labelFamilyRole(value?: string) {
    switch (value) {
      case 'father':
        return td.roleFather
      case 'mother':
        return td.roleMother
      case 'sibling':
        return td.roleChild
      case 'other':
        return td.roleOther
      default:
        return td.noValue
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/customers/me`, {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error(td.loadProfileError)
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
        setError(err?.message || td.unknownError)
      } finally {
        setLoading(false)
      }
    })()
  }, [API_BASE, router, td.loadProfileError, td.unknownError])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', td.profilePhotoAlt)

      const uploadRes = await fetch(`${API_BASE}/media`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const uploadData = await uploadRes.json().catch(() => null)

      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || td.uploadPhotoError)
      }

      const mediaId = uploadData?.doc?.id || uploadData?.id
      const mediaUrl = uploadData?.doc?.url || uploadData?.url || ''

      if (!mediaId) {
        throw new Error(td.missingUploadedMediaId)
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
        throw new Error(patchData?.message || td.updatePhotoError)
      }

      setAvatar(mediaUrl)
      setSuccess(td.photoUpdatedSuccess)
    } catch (err: any) {
      setError(err?.message || td.uploadPhotoUnknownError)
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
        throw new Error(data?.message || td.removePhotoError)
      }

      setAvatar('')
      setSuccess(td.photoRemovedSuccess)
    } catch (err: any) {
      setError(err?.message || td.unknownError)
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
      setError(td.fillRequiredFields)
      return
    }

    if (!isValidPhone(phone)) {
      setError(td.invalidPhone)
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
        throw new Error(data?.message || data?.errors?.[0]?.message || td.updateProfileError)
      }

      setSuccess(td.profileUpdatedSuccess)

      setTimeout(() => {
        router.push('/profile')
      }, 700)
    } catch (err: any) {
      setError(err?.message || td.unknownError)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.sectionCard}>
            <p className={styles.loading}>{td.loading}</p>
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
          <div className={styles.headerText}>
            <div className={styles.breadcrumb}>
              <button
                type="button"
                className={styles.backLink}
                onClick={() => router.push('/profile')}
              >
                <ArrowLeft size={16} />
                Profil
              </button>

              <span className={styles.breadcrumbSep}>/</span>

              <span className={styles.breadcrumbCurrent}>{td.pageTitle}</span>
            </div>

            <h1 className={styles.pageTitle}>{td.pageTitle}</h1>
          </div>

        </div>

        <form id="edit-profile-form" className={styles.formLayout} onSubmit={handleSubmit}>
          <SectionCard title={td.profilePhotoSection}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrap}>
                {avatar ? (
                  <img className={styles.avatarImage} src={avatar} alt={td.profilePhotoAlt} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
              </div>

              <div className={styles.avatarContent}>
                <h3 className={styles.avatarTitle}>{td.profilePhotoTitle}</h3>
                <p className={styles.avatarText}>{td.profilePhotoText}</p>

                <div className={styles.avatarActions}>
                  <label className={styles.linkUploadBtn}>
                    {uploading ? td.uploading : td.uploadNewPhoto}
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
                    {td.remove}
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={td.basicInformation} icon="👤">
            <div className={styles.grid}>
              <Field label={td.lastName}>
                <input
                  className={styles.input}
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={td.enterLastName}
                />
              </Field>

              <Field label={td.firstName}>
                <input
                  className={styles.input}
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={td.enterFirstName}
                />
              </Field>
            </div>

            <div className={styles.grid}>
              <Field label={td.dateOfBirth}>
                <input
                  className={styles.inputDisabled}
                  type="text"
                  value={formatBirthDateForInput(birthDate)}
                  disabled
                />
              </Field>

              <Field label={td.gender}>
                <select
                  className={styles.input}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">{td.select}</option>
                  <option value="male">{labelGender('male')}</option>
                  <option value="female">{labelGender('female')}</option>
                  <option value="other">{labelGender('other')}</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title={td.contactAndAddress} icon="📩">
            <Field label={td.email}>
              <div className={styles.verifiedField}>
                <input className={styles.inputDisabled} type="text" value={email} disabled />
                <span className={styles.verifiedBadge}>{td.verified}</span>
              </div>
            </Field>

            <Field label={td.phoneNumber}>
              <input
                className={styles.input}
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={td.enterPhoneNumber}
              />
            </Field>

            <Field label={td.residentialAddress}>
              <textarea
                className={styles.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={td.enterAddress}
                rows={4}
              />
            </Field>
          </SectionCard>

          <SectionCard title={td.familyRoleSection} icon="👨‍👩‍👧">
            <Field label={td.roleInFamily}>
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
            <p className={styles.infoNoteText}>{td.infoNote}</p>
          </section>

          {success ? <p className={styles.success}>{success}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.bottomActions}>
            <button
              className={styles.secondaryBtn}
              type="button"
              onClick={() => router.push('/profile')}
              disabled={saving}
            >
              {td.cancel}
            </button>

            <button className={styles.primaryBtn} type="submit" disabled={saving}>
              {saving ? td.saving : td.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}