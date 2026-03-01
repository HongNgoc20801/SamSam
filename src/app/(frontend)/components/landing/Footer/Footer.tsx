'use client'

import Link from "next/link";
import Brand from "../../Brand/Brand";
import styles from "./Footer.module.css";

export default function FooterWelcome() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>

        {/* TOP */}
        <div className={styles.top}>
          {/* 1) Brand */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandLink} aria-label="Gå til forsiden">
              <Brand size="sm" />
            </Link>

            <p className={styles.desc}>
              Bygg reisen med SamSam — enkelt, raskt og trygt.
            </p>

            <div className={styles.badges}>
              <span className={styles.badge}>Sikker</span>
              <span className={styles.badge}>Rask</span>
              <span className={styles.badge}>Brukervennlig</span>
            </div>

            {/* Open hours */}
            <div className={styles.openHours}>
              <span className={styles.openLabel}>Åpningstider:</span>
              <span className={styles.openValue}>Man–Fre, 09:00–16:00</span>
            </div>
          </div>

          {/* 2) Navigation */}
          <div className={styles.col}>
            <h4 className={styles.title}>Navigasjon</h4>
            <div className={styles.linkList}>
              <Link href="#how-it-works">Slik fungerer det</Link>
              <Link href="#features">Funksjoner</Link>
              <Link href="#why-samsam">Hvorfor SamSam</Link>
              <Link href="#about">Om oss</Link>
              <Link href="#faq">Ofte stilte spørsmål</Link>
            </div>
          </div>

          {/* 3) Contact */}
          <div className={styles.col}>
            <h4 className={styles.title}>Kontakt</h4>

            <div className={styles.contactList}>
              <div className={styles.contactRow}>
                <div className={styles.contactLabel}>Hovedkontor</div>
                <div className={styles.contactValue}>Oslo, Norge</div>
              </div>

              <div className={styles.contactRow}>
                <div className={styles.contactLabel}>E-post</div>
                <a className={styles.contactLink} href="mailto:hello@samsam.no">
                  hello@samsam.no
                </a>
              </div>

              <div className={styles.contactRow}>
                <div className={styles.contactLabel}>Telefon</div>
                <a className={styles.contactLink} href="tel:+4712345678">
                  +47 123 45 678
                </a>
              </div>
            </div>
          </div>

          {/* 4) Newsletter + Social */}
          <div className={styles.newsletter}>
            <h4 className={styles.title}>Hold deg oppdatert</h4>
            <p className={styles.small}>
              Månedlige tips og oppdateringer. Ingen spam.
            </p>

            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <input
                className={styles.input}
                type="email"
                placeholder="Din e-post"
                aria-label="E-postadresse"
              />
              <button className={styles.button} type="submit">
                Abonner
              </button>
            </form>

            <div className={styles.social}>
              <a href="#" aria-label="Twitter/X" className={styles.socialBtn}>𝕏</a>
              <a href="#" aria-label="Facebook" className={styles.socialBtn}>f</a>
              <a href="#" aria-label="Instagram" className={styles.socialBtn}>◎</a>
              <a href="#" aria-label="LinkedIn" className={styles.socialBtn}>in</a>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} SamSam. Alle rettigheter forbeholdt.</span>

          <div className={styles.bottomLinks}>
            <Link href="/privacy">Personvern</Link>
            <Link href="/terms">Vilkår</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}