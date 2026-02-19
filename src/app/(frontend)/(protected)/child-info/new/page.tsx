'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import styles from './newChild.module.css'

const BLOOD_MAIN = ['A', 'B', 'AB', 'O'] as const
const BLOOD_ALL = [
  'unknown',
  'A',
  'B',
  'AB',
  'O',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const

type Gender = 'na' | 'male' | 'female' | 'other'
type Relation = 'mother' | 'father' | 'grandparent' | 'guardian' | 'other' | ''

function normalize11Digits(v: string) {
  return v.replace(/\s+/g, '')
}

function parseTags(input: string) {
  // "Hải sản, Đậu phộng; Phấn hoa" -> [{value:"Hải sản"}, ...]
  return input
    .split(/[,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((value) => ({ value }))
}

export default function NewChildPage() {
  const router = useRouter()

  // profile
  const [avatarURL, setAvatarURL] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<Gender>('na')
  const [nationalId, setNationalId] = useState('')

  // medical
  const [bloodType, setBloodType] = useState<(typeof BLOOD_ALL)[number]>('unknown')
  const [allergyText, setAllergyText] = useState('')

  // emergency contact (single)
  const [emName, setEmName] = useState('')
  const [emPhone, setEmPhone] = useState('')
  const [emRelation, setEmRelation] = useState<Relation>('')

  // governance
  const [agree, setAgree] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return !!fullName.trim() && !!birthDate && agree && !loading
  }, [fullName, birthDate, agree, loading])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')

    const cleanNationalId = normalize11Digits(nationalId.trim())

    // optional validation at UI-level (backend validate vẫn có)
    if (cleanNationalId && !/^\d{11}$/.test(cleanNationalId)) {
      setError('Số định danh phải gồm đúng 11 chữ số.')
      return
    }

    setLoading(true)
    try {
      const body: any = {
        fullName: fullName.trim(),
        birthDate,
        gender,
      }

      if (avatarURL.trim()) body.avatarURL = avatarURL.trim()
      if (cleanNationalId) body.nationalId = cleanNationalId

      // medical: only send if user provided something
      const allergies = parseTags(allergyText)
      if (bloodType !== 'unknown' || allergies.length) {
        body.medical = {}
        if (bloodType !== 'unknown') body.medical.bloodType = bloodType
        if (allergies.length) body.medical.allergies = allergies
      }

      // emergencyContact: only send if any field
      if (emName.trim() || emPhone.trim() || emRelation) {
        body.emergencyContact = {
          name: emName.trim() || undefined,
          phone: emPhone.trim() || undefined,
          relation: emRelation || undefined,
        }
      }

      const res = await fetch('/api/children', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message || 'Kunne ikke opprette barneprofil.')

      router.push('/child-info')
    } catch (err: any) {
      setError(err?.message || 'Noe gikk galt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          ←
        </button>
        <div className={styles.title}>Thông tin của trẻ</div>
        <div className={styles.rightSpace} />
      </header>

      <form onSubmit={onSubmit} className={styles.form}>
        {/* Avatar */}
        <div className={styles.avatarBlock}>
          <div className={styles.avatarCircle}>
            <div className={styles.avatarPlaceholder}>
              {(fullName.trim()?.[0] ?? 'C').toUpperCase()}
            </div>

            <button
              type="button"
              className={styles.cameraBtn}
              onClick={() => {
                const url = prompt('Dán Avatar URL (MVP):')
                if (url) setAvatarURL(url)
              }}
              aria-label="Upload avatar"
            >
              📷
            </button>
          </div>

          <div className={styles.avatarText}>Tải ảnh đại diện</div>

          {avatarURL ? (
            <div className={styles.smallNote}>
              Đã chọn avatar URL ✓{' '}
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => setAvatarURL('')}
              >
                Xoá
              </button>
            </div>
          ) : null}
        </div>

        {/* Full name */}
        <div className={styles.field}>
          <label>Họ và tên</label>
          <input
            placeholder="Nhập họ và tên đầy đủ"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Birth date + Gender */}
        <div className={styles.row2}>
          <div className={styles.field}>
            <label>Ngày sinh</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Giới tính</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} disabled={loading}>
              <option value="na">Chọn</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        {/* National ID (optional) */}
        <div className={styles.field}>
          <label>Số định danh (11 số) (tuỳ chọn)</label>
          <input
            inputMode="numeric"
            placeholder="Ví dụ: 12345678901"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            disabled={loading}
          />
          <div className={styles.helpText}>
            Dùng cho thủ tục hành chính/y tế. Có thể để trống.
          </div>
        </div>

        {/* Blood type */}
        <div className={styles.field}>
          <label>Nhóm máu</label>

          <div className={styles.bloodRow}>
            {BLOOD_MAIN.map((b) => (
              <button
                key={b}
                type="button"
                className={`${styles.bloodBtn} ${bloodType === b ? styles.bloodActive : ''}`}
                onClick={() => setBloodType(b)}
                disabled={loading}
              >
                {b}
              </button>
            ))}

            <select
              className={styles.bloodMore}
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value as any)}
              disabled={loading}
            >
              {BLOOD_ALL.map((b) => (
                <option key={b} value={b}>
                  {b === 'unknown' ? 'Không rõ / Khác' : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Allergies (tags as text input) */}
        <div className={styles.field}>
          <label>Các loại dị ứng</label>
          <input
            placeholder="Ví dụ: Hải sản, Đậu phộng, Phấn hoa..."
            value={allergyText}
            onChange={(e) => setAllergyText(e.target.value)}
            disabled={loading}
          />
          <div className={styles.helpText}>Ngăn cách bằng dấu phẩy hoặc dấu chấm phẩy.</div>
        </div>

        {/* Emergency */}
        <div className={styles.sectionHeader}>
          <span>🚨</span>
          <span>Liên hệ khẩn cấp</span>
        </div>

        <div className={styles.card}>
          <div className={styles.field}>
            <label>Tên người liên hệ</label>
            <input
              placeholder="Họ và tên người liên hệ"
              value={emName}
              onChange={(e) => setEmName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Số điện thoại</label>
            <input
              placeholder="+84 090 123 4567"
              value={emPhone}
              onChange={(e) => setEmPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label>Quan hệ</label>
            <select
              value={emRelation}
              onChange={(e) => setEmRelation(e.target.value as Relation)}
              disabled={loading}
            >
              <option value="">Chọn</option>
              <option value="guardian">Người giám hộ</option>
              <option value="grandparent">Ông/Bà</option>
              <option value="mother">Mẹ</option>
              <option value="father">Bố</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        {/* Agreement */}
        <label className={styles.agree}>
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={loading}
          />
          <span>Tôi hiểu đây là thông tin được chia sẻ trong nhóm gia đình</span>
        </label>

        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}

        <button className={styles.primary} type="submit" disabled={!canSubmit}>
          {loading ? 'Đang lưu…' : 'Lưu hồ sơ'}
        </button>
      </form>
    </div>
  )
}
