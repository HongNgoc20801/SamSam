import styles from "./AboutSection.module.css";
import {
  Baby,
  AlertTriangle,
  MessageCircleOff,
  Layers,
  ShieldCheck,
  FileClock,
  CalendarDays,
  Heart,
  ArrowRight,
} from "lucide-react";

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


  const challengeIcons = [Baby, AlertTriangle, MessageCircleOff, Layers];
  const principleIcons = [ShieldCheck, FileClock, CalendarDays, Heart];

  return (
    <section className={styles.section} id="about">
      <div className={styles.container}>
       
        <header className={styles.header}>
          <h2 className={styles.title}>{data.title}</h2>
          <p className={styles.subtitle}>{data.content}</p>
        </header>

       
        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.panel}>
              <div className={styles.panelLabel}>UTFORDRINGER VI LØSER</div>


              <div className={styles.timeline}>
                {utfordringer.map((item, idx) => {
                  const Icon = challengeIcons[idx] ?? Layers;

                  return (
                    <div key={idx} className={styles.tItem}>
                      <div className={styles.tIconWrap}>
                        <span className={styles.tIcon} aria-hidden="true">
                          <Icon size={16} />
                        </span>

                        {idx !== utfordringer.length - 1 ? (
                          <span className={styles.tLine} aria-hidden="true" />
                        ) : null}
                      </div>

                      <div className={styles.tBody}>
                        <div className={styles.tTitle}>{item.title}</div>
                        {item.description ? (
                          <div className={styles.tText}>{item.description}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.rightLabel}>VÅRE STRUKTURELLE PRINSIPPER</div>

            <div className={styles.grid}>
              {prinsipper.map((p, idx) => {
                const Icon = principleIcons[idx] ?? ShieldCheck;

                return (
                  <div
                    key={idx}
                    className={`${styles.pCard} ${styles[`pVar${(idx % 4) + 1}`]}`}
                  >
                    <div className={styles.pHeader}>
                      <span className={styles.pMiniIcon} aria-hidden="true">
                        <Icon size={16} />
                      </span>

                      <div className={styles.pHeading}>
                        <h3 className={styles.pTitle}>{p.title}</h3>
                      </div>
                    </div>

                    <p className={styles.pText}>{p.description}</p>
                  </div>
                );
              })}
            </div>

            <div className={styles.sectionCTA}>
              <a href="#how-it-works" className={styles.linkBtn}>
                Se hvordan strukturen fungerer <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}