'use client'

import styles from './Brand.module.css'

type BrandProps = {
  size?: 'sm' | 'lg'
  className?: string
}

export default function Brand({ size = 'lg', className = '' }: BrandProps) {
  const w = size === 'sm' ? 42 : 58
  const h = size === 'sm' ? 32 : 44
  const strokeWidth = size === 'sm' ? 2.2 : 2.5

  return (
    <div className={`${styles.brand} ${styles[size]} ${className}`}>
      <div className={styles.icon} aria-hidden="true">
        <svg width={w} height={h} viewBox="0 0 58 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18.9 9.1c-2.6-2.6-6.7-2.6-9.3 0s-2.6 6.7 0 9.3L29 37.8l19.4-19.4c2.6-2.6 2.6-6.7 0-9.3s-6.7-2.6-9.3 0L29 19 18.9 9.1z"
            className={styles.heart}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className={styles.text}>
        <div className={styles.name}>Sam</div>
        <div className={styles.name}>Sam</div>
      </div>
    </div>
  )
}
