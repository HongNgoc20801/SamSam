'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./Navigation.module.css";
import Brand from "../../Brand/Brand";

const navLinks = [
  { href: "#how", label: "How Samsam work" },
  { href: "#features", label: "Features" },
  { href: "#why", label: "Why Choose Samsam" },
  { href: "#about", label: "About us" },
  { href: "#faq", label: "FAQ" },
];

export default function NavbarWelcome() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 820) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink} aria-label="Go to homepage">
          <Brand size="sm" />
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.buttons}>
          <Link href="/login" className={styles.login}>
            Log In
          </Link>
          <Link href="/register" className={styles.getStarted}>
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className={`${styles.menuToggle} ${isOpen ? styles.menuToggleOpen : ""}`}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        id="mobile-menu"
        className={`${styles.mobilePanel} ${isOpen ? styles.mobilePanelOpen : ""}`}
      >
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.mobileButtons}>
          <Link href="/login" className={styles.login} onClick={closeMenu}>
            Log In
          </Link>
          <Link href="/register" className={styles.getStarted} onClick={closeMenu}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}