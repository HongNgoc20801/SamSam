import styles from "./whySamsam.module.css"

interface Props {
  data: {
    eyebrow?: string | null;
    title: string;
    image?: { url: string } | null; 
    reasons?: { title: string; description?: string | null }[] | null;
    closingStatement?: string | null;
  };
}

export default function WhySamsam({ data }: Props) {
  const reasons = data.reasons ?? [];
  const imgUrl = data.image?.url ?? "";

  return (
    <section id="why-samsam" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* LEFT */}
          <div className={styles.left}>
            
              {imgUrl ? (
                <img className={styles.img} src={imgUrl} alt={data.title} />
              ) : (
                <div className={styles.mockPlaceholder}>
                  <div className={styles.placeholderTop} />
                  <div className={styles.placeholderRow} />
                  <div className={styles.placeholderRow} />
                </div>
              )}
            
          </div>

          {/* RIGHT */}
          <div className={styles.right}>
            <h2 className={styles.title}>{data.title}</h2>

            <ul className={styles.list}>
              {reasons.map((r, i) => (
                <li key={i} className={styles.item}>
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>

                  <div className={styles.itemBody}>
                    <div className={styles.itemTitle}>{r.title}</div>
                    {r.description ? (
                      <div className={styles.itemDesc}>{r.description}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {data.closingStatement ? (
              <p className={styles.closing}>{data.closingStatement}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
