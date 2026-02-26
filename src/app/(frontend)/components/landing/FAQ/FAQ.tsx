import styles from "./FAQ.module.css";

interface Props {
  data: {
    title: string;
    items?: { question: string; answer: string }[] | null;
  };
}

export default function FAQ({ data }: Props) {
  const items = data.items ?? [];
  if (!items.length) return null;

  return (
    <section id="faq" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>{data.title}</h2>
          <p className={styles.sub}>
            Ofte stilte spørsmål som hjelper deg å forstå SamSam raskere.          
          </p>
        </header>

        <div className={styles.list}>
          {items.map((it, i) => (
            <details key={i} className={styles.item}>
              <summary className={styles.summary}>
                <span className={styles.q}>{it.question}</span>
                <span className={styles.icon} aria-hidden="true">+</span>
              </summary>

              <div className={styles.answer}>
                <p>{it.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}