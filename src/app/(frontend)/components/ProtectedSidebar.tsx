'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import styles from '../(protected)/protectedLayout.module.css'
import Brand from './Brand/Brand'
import LogoutButton from '../../(frontend)/components/LogoutButton'
import { useTranslations } from '@/app/lib/i18n/useTranslations'

function Icon({
  type,
}: {
  type:
    | 'dash'
    | 'cal'
    | 'posts'
    | 'money'
    | 'child'
    | 'profile'
    | 'settings'
    | 'history'
}) {
  const common = {
    className: styles.icon,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  }

  switch (type) {
    case 'dash':
      return (
        <svg {...common}>
          <path
            d="M4 13h7V4H4v9zM13 20h7V11h-7v9zM4 20h7v-5H4v5zM13 4h7v5h-7V4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )

    case 'cal':
      return (
        <svg {...common}>
          <path
            d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'posts':
      return (
        <svg {...common}>
          <path
            d="M7 7h10M7 11h10M7 15h7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-4 2v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      )

    case 'money':
      return (
        <svg {...common}>
          <path d="M3 7h18v10H3V7z" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M7 12h.01M17 12h.01"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      )

    case 'child':
      return (
        <svg {...common}>
          <path
            d="M8.5 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M3.5 20a5 5 0 0 1 10 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M14.5 20a4.5 4.5 0 0 1 6-4.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'profile':
      return (
        <svg {...common}>
          <path
            d="M12 13a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4.5 21a7.5 7.5 0 0 1 15 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M15.5 8.5h.01"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'settings':
      return (
        <svg {...common}>
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.6H11l-.3 2.6a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.9 7.9 0 0 0-.1 1c0 .34.03.67.1 1l-2 1.5 2 3.5 2.4-1c.52.4 1.1.74 1.7 1l.3 2.6h4l.3-2.6c.6-.26 1.18-.6 1.7-1l2.4 1 2-3.5-2-1.5z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      )

    case 'history':
      return (
        <svg {...common}>
          <path
            d="M12 8v5l3 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 12a8 8 0 1 1-2.35-5.65"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M20 4v4h-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

export default function ProtectedSidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const t = useTranslations()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const firstName = user?.firstName ?? '—'
  const lastName = user?.lastName ?? ''
  const role = user?.familyRole ?? '-'
  const email = user?.email ?? '-'
  const initials = `${firstName?.[0] ?? 'U'}${lastName?.[0] ?? ''}`.toUpperCase()

  const links = [
    { href: '/dashboard', label: t.sidebar.dashboard, icon: 'dash' as const },
    { href: '/calendar', label: t.sidebar.calendar, icon: 'cal' as const },
    { href: '/oppdateringer', label: t.sidebar.updates, icon: 'posts' as const },
    { href: '/economy', label: t.sidebar.economy, icon: 'money' as const },
    { href: '/child-info', label: t.sidebar.childInfo, icon: 'child' as const },
    { href: '/audit-logs', label: t.sidebar.history, icon: 'history' as const },
    { href: '/profile', label: t.sidebar.profile, icon: 'profile' as const },
    { href: '/settings', label: t.sidebar.settings, icon: 'settings' as const },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.mobileMenuButton} ${menuOpen ? styles.mobileMenuButtonHidden : ''}`}
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="protected-sidebar"
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen ? (
        <button
          type="button"
          className={styles.sidebarOverlay}
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <aside
        id="protected-sidebar"
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}
        aria-label="Sidebar"
      >
        <div className={styles.sidebarInner}>
          <div className={styles.mobileSidebarTop}>
            <div className={styles.brandWrap}>
              <Brand />
            </div>

            <button
              type="button"
              className={styles.mobileCloseButton}
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <nav className={styles.nav} aria-label={t.sidebar.navAria}>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`${styles.navItem} ${isActive(l.href) ? styles.navItemActive : ''}`}
              >
                <Icon type={l.icon} />
                <span className={styles.navLabel}>{l.label}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <section className={styles.accountCard} aria-label={t.sidebar.signedInAs}>
              <div className={styles.accountLeft}>
                <div className={styles.accountAvatar}>
                  {user?.avatar?.url ? (
                    <img
                      src={user.avatar.url}
                      alt={`${firstName} ${lastName}`}
                      className={styles.accountAvatarImage}
                    />
                  ) : (
                    <span className={styles.accountInitials}>{initials}</span>
                  )}
                </div>

                <div className={styles.accountMeta}>
                  <div className={styles.accountName}>
                    {firstName} {lastName}
                  </div>
                  <div className={styles.accountRole}>{String(role).toUpperCase()}</div>
                  <div className={styles.accountEmail}>{email}</div>
                </div>
              </div>

              <div className={styles.accountAction}>
                <LogoutButton />
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  )
}