import styles from "./AboutSection.module.css";

interface Props {
  data: {
    title: string;
    content: string;
    principles?: { text: string }[] | null;
    outcomes?: { text: string }[] | null;
  };
}

export default function AboutSection({ data }: Props) {
  const hasPrinciples = !!data.principles?.length;
  const hasOutcomes = !!data.outcomes?.length;

  return (
    <section className={styles.about}>
      {/* QUOTE lớn */}
      <h2 className={styles.quote}>“{data.title}”</h2>

      {/* CARD */}
      <div className={styles.card}>
        <p className={styles.cardText}>{data.content}</p>

        {(hasPrinciples || hasOutcomes) && (
          <div className={styles.columns}>
            {hasPrinciples && (
              <div className={styles.listCol}>
                <h3 className={styles.listTitle}>Principles</h3>
                <ul className={styles.list}>
                  {data.principles!.map((p, i) => (
                    <li key={i} className={styles.listItem}>
                      {p.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasOutcomes && (
              <div className={styles.listCol}>
                <h3 className={styles.listTitle}>Outcomes</h3>
                <ul className={styles.list}>
                  {data.outcomes!.map((o, i) => (
                    <li key={i} className={styles.listItem}>
                      {o.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
