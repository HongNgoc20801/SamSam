import styles from "./HowItWork.module.css";

interface Props {
  data: {
    title: string;
    steps?: {
      stepNumber: number;
      title: string;
      description: string;
    }[] | null;
  };
}

export default function HowItWorks({ data }: Props) {
  const steps = (data.steps ?? []).slice().sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>{data.title}</h2>
          <div className={styles.underline} />
        </header>

        <div className={styles.timeline} aria-label="How it works steps">
          {steps.map((step) => (
            <div key={step.stepNumber} className={styles.step}>
              <div className={styles.badge} aria-hidden="true">
                {String(step.stepNumber).padStart(2, "0")}
              </div>

              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
