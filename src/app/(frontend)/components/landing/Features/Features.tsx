import styles from "./Features.module.css"
import { Layers, FileClock, Baby, Scale } from "lucide-react"

type FeatureItem = {
  featureTitle: string
  description?: string | null
  points?: { text: string }[] | null
}

type FeatureImage =
  | string
  | {
      url?: string | null
      alt?: string | null
    }
  | null
  | undefined

interface Props {
  data: {
    title: string
    intro?: string | null
    image?: FeatureImage
    items: FeatureItem[]
  }
}

function getImageUrl(image?: FeatureImage): string {
  if (!image) return ""
  if (typeof image === "string") return image.trim()
  return image.url?.trim() || ""
}

function getImageAlt(image: FeatureImage, fallback: string): string {
  if (!image) return fallback
  if (typeof image === "string") return fallback
  return image.alt?.trim() || fallback
}

const ICONS = [Layers, FileClock, Baby, Scale]

export default function Features({ data }: Props) {
  const imageUrl = getImageUrl(data.image)
  const imageAlt = getImageAlt(data.image ?? null, data.title)

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.left}>
            <h2 className={styles.title}>{data.title}</h2>

            {data.intro ? <p className={styles.intro}>{data.intro}</p> : null}

            {imageUrl ? (
              <div className={styles.imageWrap}>
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className={styles.image}
                />
              </div>
            ) : null}

            <p className={styles.closing}>
              Strukturen i seg selv reduserer konflikt.
            </p>
          </div>

          <div className={styles.right}>
            {data.items?.map((item, index) => {
              const description =
                item.description?.trim() ||
                item.points?.[0]?.text?.trim() ||
                ""

              const Icon = ICONS[index] ?? Layers

              return (
                <div key={index} className={styles.feature}>
                  <div className={styles.icon} aria-hidden="true">
                    <Icon size={20} />
                  </div>

                  <div className={styles.featureBody}>
                    <h3 className={styles.featureTitle}>
                      {item.featureTitle}
                    </h3>

                    {description ? (
                      <p className={styles.featureDesc}>{description}</p>
                    ) : null}
                  </div>
                </div>
              )
            })}

            <a className={styles.linkBtn} href="#faq">
              Les vanlige spørsmål →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}