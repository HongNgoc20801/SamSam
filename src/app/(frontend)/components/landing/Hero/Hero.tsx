import styles from "./Hero.module.css";
import { ShieldCheck, FileText, Baby } from "lucide-react";

interface Props {
  data: {
    title: string;
    subtitle: string;
    description: string;
    image: { url: string };
    primaryCTA: { label: string; url: string };
    secondaryCTA?: { label?: string | null; url?: string | null } | null;
  };
}

export default function HeroSection({ data }: Props) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
        {/* LEFT */}
        <div className={styles.content}>
          <h1 className={styles.title}>{data.title}</h1>

          <h2 className={styles.subtitle}>{data.subtitle}</h2>

          <p className={styles.description}>{data.description}</p>
          {/* TRUST SIGNALS */}
          <div className={styles.trust} aria-label="Trust signals">
            <div className={styles.trustItem}>
              <ShieldCheck size={18} className={styles.trustIcon} />
              <span>Sikker tilgang</span>
            </div>

            <div className={styles.trustItem}>
              <FileText size={18} className={styles.trustIcon} />
              <span>Full historikk log</span>
            </div>

            <div className={styles.trustItem}>
              <Baby size={18} className={styles.trustIcon} />
              <span>Barnet i sentrum</span>
            </div>
          </div>

          <div className={styles.actions}>
            <a href={data.primaryCTA.url} className={styles.primaryBtn}>
              {data.primaryCTA.label}
            </a>

            {data.secondaryCTA?.label && data.secondaryCTA?.url ? (
              <a href={data.secondaryCTA.url} className={styles.secondaryBtn}>
                {data.secondaryCTA.label}
              </a>
            ) : null}
          </div>

          
        </div>

        {/* RIGHT */}
        <div className={styles.imageCard}>
          <img
            src={data.image.url}
            alt={data.title}
            className={styles.image}
          />
        </div>
      </div>
    </section>
  );
}