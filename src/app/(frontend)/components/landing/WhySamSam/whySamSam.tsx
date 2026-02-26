import styles from "./whySamSam.module.css";
import Image from "next/image";

interface Props {
  data: {
    title: string;
    description?: string | null;
    image?: { url: string } | null; 
    reasons?: { title: string; description?: string | null }[] | null;
  };
}

type Point = { x: number; y: number; text: string };

export default function WhySamsam({ data }: Props) {
  const reasons = data.reasons ?? [];

  const positions: Array<{ x: number; y: number }> = [
    { x: 50, y: 22 }, 
    { x: 70, y: 30 },
    { x: 82, y: 40 },
    { x: 82, y: 60 },
    { x: 66, y: 72 },
    { x: 50, y: 80 }, 
    { x: 34, y: 72 },
    { x: 18, y: 60 },
    { x: 18, y: 40 },
    { x: 30, y: 30 },
  ];

  const points: Point[] = reasons.slice(0, positions.length).map((r, i) => ({
    x: positions[i].x,
    y: positions[i].y,
    text: r.title,
  }));

  return (
    <section id="why-samsam" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>{data.title}</h2>
          {data.description ? <p className={styles.desc}>{data.description}</p> : null}
        </header>

        <div className={styles.orbit}>
          <svg
            className={styles.connectors}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {points.map((p, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={p.x}
                y2={p.y}
                className={styles.connectorLine}
              />
            ))}
          </svg>

          <div className={styles.center} aria-label="Samsam logo">
            <Image
              src="/SamSamlogo.png"
              alt="Samsam"
              width={86}
              height={86}
              className={styles.centerLogo}
              priority
            />
          </div>

          {points.map((p, i) => (
            <div
              key={i}
              className={styles.pill}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={p.text}
            >
              <span className={styles.pillText}>{p.text}</span>
            </div>
          ))}
        </div>

        <div className={styles.mobileList}>
          {reasons.map((r, i) => (
            <div key={i} className={styles.mobileItem}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.mobileText}>{r.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}