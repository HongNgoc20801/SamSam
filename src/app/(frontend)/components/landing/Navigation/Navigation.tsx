// components/NavbarWelcome.tsx
import Link from "next/link";
import styles from "./Navigation.module.css"
import Brand from "../../Brand/Brand";

export default function NavbarWelcome() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>

        {/* Logo */}
        <Link href="/" className={styles.logoLink} aria-label="Go to homepage">
          <Brand size="sm" />
        </Link>

        {/* Navigation */}
        <nav className={styles.nav}>
          <Link href="#how-it-works">How Samsam work</Link>
          <Link href="#features">Features</Link>
          <Link href="#why-samsam">Why Choose Samsam</Link>
        </nav>

        {/* Buttons */}
        <div className={styles.buttons}>
          <Link href="/login">
            <button className={styles.login}>Log In</button>
          </Link>
          <Link href="/register">
            <button className={styles.getStarted}>Get Started</button>
          </Link>
        </div>

      </div>
    </header>
  );
}
