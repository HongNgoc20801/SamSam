import styles from "./Hero.module.css";

interface Props {
  data: {
    title: string;
    subtitle: string;
    description: string;
    image: {
      url: string;
    };
    primaryCTA: {
      label: string;
      url: string;
    };
    secondaryCTA?: {
      label?: string | null;
      url?: string | null;
    } | null;
  };
}

export default function HeroSection({ data }: Props) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
      
        <div className={styles.content}>
          <h1 className={styles.title}>{data.title}</h1>
          <h2 className={styles.subtitle}>{data.subtitle}</h2>
          <p className={styles.description}>{data.description}</p>

          <div className={styles.actions}>
            <a href={data.primaryCTA.url} className={styles.primaryBtn}>
              {data.primaryCTA.label}
            </a>

            {data.secondaryCTA?.label && data.secondaryCTA?.url && (
              <a href={data.secondaryCTA.url} className={styles.secondaryBtn}>
                {data.secondaryCTA.label}
              </a>
            )}
          </div>
        </div>

        
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
