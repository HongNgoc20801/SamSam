'use client'
 
import Image from 'next/image'
import styles from './Brand.module.css'

type BrandProps = {
  size?: 'sm' | 'lg'
  className?: string
  alt?: string
}
 
export default function Brand({
  size = 'lg',
  className = '',
  alt = 'SamSam logo',
}: BrandProps) {
  const w = size === 'sm' ? 60 : 84
  const h = size === 'sm' ? 60 : 84
 
  return (
    <div className={`${styles.brand} ${styles[size]} ${className}`}>
        <Image
          src="/images/SamSamlogo (3).png"
          alt={alt}
          width={w}
          height={h}
          className={styles.logoImg}
          priority
        />
    </div>
   
  )
}
 