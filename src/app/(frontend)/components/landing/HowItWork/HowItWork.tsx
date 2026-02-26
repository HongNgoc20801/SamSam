import styles from "./HowItWork.module.css";
import Link from "next/link";
import { Link2, CalendarDays, Receipt, Heart } from "lucide-react";

interface Props {
  data: {
    title: string;
    description?: string;
    steps?: {
      stepNumber: number;
      title: string;
      description: string;
    }[] | null;
  };
}

function StepIcon({ stepNumber }: { stepNumber: number }) {
  const commonProps = { size: 18, className: styles.stepIcon, "aria-hidden": true as const };

  switch (stepNumber) {
    case 1:
      return <Link2 {...commonProps} />;
    case 2:
      return <CalendarDays {...commonProps} />;
    case 3:
      return <Receipt {...commonProps} />;
    case 4:
      return <Heart {...commonProps} />;
    default:
      return <span className={styles.stepIconFallback} aria-hidden="true">•</span>;
  }
}

export default function HowItWorks({ data }: Props) {
  const steps = (data.steps ?? []).slice().sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>{data.title}</h2>
          <div className={styles.underline} />
          {data.description ? <p className={styles.subtitle}>{data.description}</p> : null}
        </header>

        <div className={styles.stepsWrap} aria-label="How it works steps">
          <div className={styles.connector} aria-hidden="true" />

          <div className={styles.grid}>
            {steps.map((step) => (
              <article key={step.stepNumber} className={styles.card}>
                <div className={styles.top}>
                  <div className={styles.iconBox}>
                    <StepIcon stepNumber={step.stepNumber} />
                  </div>

                  <span className={styles.badge} aria-hidden="true">
                    {String(step.stepNumber).padStart(2, "0")}
                  </span>
                </div>

                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardDesc}>{step.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.ctaRow}>
          <Link href="/login" className={styles.cta}>
            Kom i gang med Samsam
          </Link>
        </div>
      </div>
    </section>
  );
}