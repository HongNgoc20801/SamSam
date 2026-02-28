import Image from "next/image";
import styles from "./Features.module.css";
import { Layers, FileClock, Baby, Scale } from "lucide-react";

type FeatureItem = {
  featureTitle: string;
  description?: string | null;
  points?: { text: string }[] | null;
};

type FeatureImage =
  | string
  | {
      url?: string | null;
      alt?: string | null;
      width?: number | null;
      height?: number | null;
    }
  | null
  | undefined;

interface Props {
  data: {
    title: string;
    intro?: string | null;
    image?: FeatureImage;
    items: FeatureItem[];
  };
}

function getImageUrl(image?: FeatureImage): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.url?.trim() || "";
}

function getImageAlt(image: FeatureImage, fallback: string): string {
  if (!image) return fallback;
  if (typeof image === "string") return fallback;
  return image.alt?.trim() || fallback;
}

function getImageDims(image: FeatureImage): { width: number; height: number } {
  const fallback = { width: 1100, height: 650 };
  if (!image || typeof image === "string") return fallback;

  const w = image.width ?? undefined;
  const h = image.height ?? undefined;

  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  return fallback;
}

const ICONS = [Layers, FileClock, Baby, Scale];

export default function Features({ data }: Props) {
  const imageUrl = getImageUrl(data.image);
  const imageAlt = getImageAlt(data.image ?? null, data.title);
  const { width, height } = getImageDims(data.image ?? null);

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* LEFT */}
          <div className={styles.left}>
            <h2 className={styles.title}>{data.title}</h2>

            {data.intro ? <p className={styles.intro}>{data.intro}</p> : null}

            {imageUrl ? (
              <div className={styles.imageWrap}>
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  width={width}
                  height={height}
                  className={styles.image}
                  sizes="(max-width: 900px) 100vw, 520px"
                  priority={false}
                />
              </div>
            ) : null}

            {/* Optional closing line */}
            <p className={styles.closing}>
              Strukturen i seg selv reduserer konflikt.
            </p>
          </div>

          {/* RIGHT */}
          <div className={styles.right}>
            {data.items?.map((item, i) => {
              const desc =
                item.description?.trim() ||
                item.points?.[0]?.text?.trim() ||
                "";

              const Icon = ICONS[i] ?? Layers;

              return (
                <div key={i} className={styles.feature}>
                  <div className={styles.icon} aria-hidden="true">
                    <Icon size={20} />
                  </div>

                  <div className={styles.featureBody}>
                    <h3 className={styles.featureTitle}>{item.featureTitle}</h3>
                    {desc ? <p className={styles.featureDesc}>{desc}</p> : null}
                  </div>
                </div>
              );
            })}

            {/* CTA nhỏ để dẫn qua phần tiếp theo */}
            <a className={styles.linkBtn} href="#faq">
              Les vanlige spørsmål →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}