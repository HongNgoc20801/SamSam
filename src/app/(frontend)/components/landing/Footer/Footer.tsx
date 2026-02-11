'use client'

import Link from "next/link";
import Brand from "../../Brand/Brand";
import styles from "./Footer.module.css"
export default function FooterWelcome() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>

        {/* Top */}
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandLink} aria-label="Go to homepage">
              <Brand size="sm" />
            </Link>

            <p className={styles.desc}>
              Build your journey with Samsam — simple, fast, and lovely.
            </p>

            <div className={styles.badges}>
              <span className={styles.badge}>Secure</span>
              <span className={styles.badge}>Fast</span>
              <span className={styles.badge}>Friendly</span>
            </div>
          </div>

          {/* Links */}
          <div className={styles.links}>
            <div className={styles.col}>
              <h4 className={styles.title}>Product</h4>
              <Link href="#features">Features</Link>
              <Link href="#how-it-works">How it works</Link>
              <Link href="#why-samsam">Why Samsam</Link>
            </div>

            <div className={styles.col}>
              <h4 className={styles.title}>Company</h4>
              <Link href="/about">About</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/contact">Contact</Link>
            </div>

            <div className={styles.col}>
              <h4 className={styles.title}>Legal</h4>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/cookies">Cookies</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className={styles.newsletter}>
            <h4 className={styles.title}>Stay in the loop</h4>
            <p className={styles.small}>
              Monthly tips & updates. No spam.
            </p>

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <input
                className={styles.input}
                type="email"
                placeholder="Your email"
                aria-label="Email address"
              />
              <button className={styles.button} type="submit">
                Subscribe
              </button>
            </form>

            <div className={styles.social}>
              <a href="#" aria-label="Twitter" className={styles.socialBtn}>𝕏</a>
              <a href="#" aria-label="Facebook" className={styles.socialBtn}>f</a>
              <a href="#" aria-label="Instagram" className={styles.socialBtn}>◎</a>
              <a href="#" aria-label="GitHub" className={styles.socialBtn}>⌂</a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} Samsam. All rights reserved.</span>
          <div className={styles.bottomLinks}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
