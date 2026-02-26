import styles from "./FinalCTA.module.css";
import Link from "next/link";

interface Props {
  data: {
    title: string;
    description: string;
    primaryButton: {
      label: string;
      url: string;
    };
    secondaryButton?: {
      label?: string | null;
      url?: string | null;
    } | null;
  };
}

export default function FinalCTA({ data }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>{data.title}</h2>

        <p className={styles.description}>{data.description}</p>

        <div className={styles.actions}>
          <Link href={data.primaryButton.url} className={styles.primaryBtn}>
            {data.primaryButton.label}
          </Link>

          {data.secondaryButton?.label &&
          data.secondaryButton?.url ? (
            <Link
              href={data.secondaryButton.url}
              className={styles.secondaryBtn}
            >
              {data.secondaryButton.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}