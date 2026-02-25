import styles from "./AboutSection.module.css";

interface Props {
  data: {
    title: string; 
    content: string; 
    utfordringer?: { title?: string; description?: string; text?: string }[] | null;
    prinsipper?: { title: string; description: string }[] | null;
  };
}

export default function AboutSection({ data }: Props) {
  const utfordringer = (data.utfordringer ?? []).map((u) => ({
    title: u.title ?? u.text ?? "",
    description: u.description ?? "",
  }));

  const prinsipper = data.prinsipper ?? [];

  return (
    <section className={styles.section} id="about">
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h2 className={styles.title}>{data.title}</h2>
          <p className={styles.subtitle}>{data.content}</p>
        </header>

        {/* Content */}
        <div className={styles.layout}>
          {/* Left: Challenges */}
          <div className={styles.left}>
            <div className={styles.panel}>
              <div className={styles.panelLabel}>UTFORDRINGER VI LØSER</div>

              <div className={styles.timeline}>
                {utfordringer.map((item, idx) => (
                  <div key={idx} className={styles.tItem}>
                    <div className={styles.tIconWrap}>
                      <span className={styles.tIcon}>
                        {idx === 0 ? "🙂" : idx === 1 ? "⚠️" : "💡"}
                      </span>
                      {idx !== utfordringer.length - 1 && (
                        <span className={styles.tLine} />
                      )}
                    </div>

                    <div className={styles.tBody}>
                      <div className={styles.tTitle}>{item.title}</div>
                      {item.description ? (
                        <div className={styles.tText}>{item.description}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Principles */}
          <div className={styles.right}>
            <div className={styles.rightLabel}>VÅRE PRINSIPPER</div>

            <div className={styles.grid}>
              {prinsipper.map((p, idx) => (
                <div
                  key={idx}
                  className={`${styles.pCard} ${styles[`pVar${(idx % 4) + 1}`]}`}
                >
                  <div className={styles.pTop}>
                    <div className={styles.pNumber}>
                      {(idx + 1).toString().padStart(2, "0")}
                    </div>
                  </div>

                  <div className={styles.pTitleRow}>
                    <span className={styles.pMiniIcon}>
                      {idx === 0 ? "🛡️" : idx === 1 ? "💜" : idx === 2 ? "✅" : "♻️"}
                    </span>
                    <h3 className={styles.pTitle}>{p.title}</h3>
                  </div>

                  <p className={styles.pText}>{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}