// src/app/(frontend)/about/page.tsx
import { getPayload } from "payload";
import config from "@payload-config";
import styles from "./AboutUspage.module.css";
import Link from "next/link";

export default async function AboutPage() {
  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: "aboutPage",
    limit: 1,
    depth: 2,
  });

  const about = result.docs[0];

  if (!about) return <p>About page content not found.</p>;

  const heroImageUrl =
    typeof about.hero.image === "object" && about.hero.image?.url
      ? about.hero.image.url
      : "";

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            {/* pill nhỏ */}
            <span className={styles.eyebrow}>VÅR REISE</span>

            {/* tách "Om" và "SamSam" */}
            {(() => {
              const parts = (about.hero.title ?? "").trim().split(" ");
              const first = parts[0] ?? "";
              const rest = parts.slice(1).join(" ");

              return (
                <h1 className={styles.heroTitle}>
                  {first} <span className={styles.heroTitleEm}>{rest}</span>
                </h1>
              );
            })()}

            <p className={styles.heroSubtitle}>{about.hero.subtitle}</p>
          </div>

          <div className={styles.heroMedia}>
            {heroImageUrl ? (
              <img className={styles.heroImg} src={heroImageUrl} alt={about.hero.title} />
            ) : (
              <div className={styles.heroImgPlaceholder} />
            )}
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className={`${styles.section} ${styles.quoteSection}`}>
        <div className={styles.container}>
          <h2 className={styles.h2}>{about.intro.title}</h2>
          <p className={styles.p}>{about.intro.content}</p>
        </div>
      </section>

      {/* MISSION + VISION */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.grid2}>
            <div className={styles.card}>
              <h3 className={styles.h3}>{about.missionVision.missionTitle}</h3>
              <p className={styles.p}>{about.missionVision.missionText}</p>
            </div>
            <div className={styles.card}>
              <h3 className={styles.h3}>{about.missionVision.visionTitle}</h3>
              <p className={styles.p}>{about.missionVision.visionText}</p>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className={`${styles.section} ${styles.valuesSection}`}>
        <div className={styles.container}>
          <h2 className={styles.h2}>{about.values.title}</h2>

          <div className={styles.grid3}>
            {(about.values.items ?? []).map((v: any, i: number) => (
              <div key={i} className={styles.valueCard}>
                <div className={styles.valueTitle}>{v.title}</div>
                <div className={styles.valueDesc}>{v.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className={styles.storySection}>
        <div className={styles.container}>
          <div className={styles.storyCard}>
            {/* LEFT: text */}
            <div className={styles.storyText}>
              {(() => {
                const title = (about.story.title ?? "").trim();
                const parts = title.split(" ");
                const first = parts.slice(0, 2).join(" ");     // "Hvorfor vi"
                const rest = parts.slice(2).join(" ");         // "startet SamSam"

                return (
                  <h2 className={styles.storyTitle}>
                    {first} <span className={styles.storyTitleEm}>{rest}</span>
                  </h2>
                );
              })()}

              {String(about.story.content ?? "")
                .split(/\n\s*\n/) // tách theo dòng trống (paragraph)
                .filter(Boolean)
                .map((t, i) => (
                  <p
                    key={i}
                    className={t.trim().startsWith('"') || t.trim().startsWith("“") ? styles.storyQuote : styles.storyP}
                  >
                    {t}
                  </p>
                ))}
            </div>

            {/* RIGHT: image */}
            <div className={styles.storyMedia}>
              <div className={styles.storyMediaBg}>
                {/* Nếu bạn chưa có story image từ CMS thì để placeholder vẫn đẹp */}
                <div className={styles.storyFrame}>
                  {/* Nếu sau này bạn có storyImageUrl thì thay placeholder bằng <img .../> */}
                  <div className={styles.storyImgPlaceholder} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMMITMENT */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.h2}>{about.commitment.title}</h2>
          <ul className={styles.list}>
            {(about.commitment.items ?? []).map((it: any, i: number) => (
              <li key={i} className={styles.listItem}>{it.text}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <div>
              <h2 className={styles.ctaTitle}>{about.cta.title}</h2>
              <p className={styles.ctaText}>{about.cta.text}</p>
            </div>

            <Link className={styles.ctaBtn} href={about.cta.button.url}>
              {about.cta.button.label}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}