import { getPayload } from "payload"
import config from "@payload-config"

import HeroSection from "./components/landing/Hero/Hero"
import AboutSection from "./components/landing/About/AboutSection"
import HowItWorks from "./components/landing/HowItWork/HowItWork"
import Features from "./components/landing/Features/Features"
import WhySamsam from "./components/landing/WhySamSam/whySamSam"
import NavbarWelcome from "./components/landing/Navigation/Navigation"
import FooterWelcome from "./components/landing/Footer/Footer"
import FAQ from "./components/landing/FAQ/FAQ"
import FinalCTA from "./components/landing/FinalCTA/FinalCTA"

import styles from "./page.module.css"

export const dynamic = "force-dynamic"

type MediaImage = {
  url: string
  alt?: string
}

function getMediaImage(media: any): MediaImage | null {
  if (!media) return null

  if (typeof media === "object" && media.url) {
    return {
      url: media.url,
      alt: media.alt ?? "",
    }
  }

  return null
}

export default async function LandingPage() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: "landingPage",
    limit: 1,
    depth: 2,
    sort: "-updatedAt",
  })

  const landing = result.docs[0]

  if (!landing) {
    return <p>Landing page content not found.</p>
  }

  const heroImage = getMediaImage(landing.hero?.image)
  const featuresImage = getMediaImage(landing.features?.image)
  const whySamsamImage = getMediaImage(landing.whySamsam?.image)

  console.log("Hero image:", heroImage)
  console.log("Features image:", featuresImage)
  console.log("Why Samsam image:", whySamsamImage)

  return (
    <div className={styles.page}>
      <NavbarWelcome />

      <main className={styles.main}>
        <HeroSection
          data={{
            title: landing.hero?.title ?? "",
            subtitle: landing.hero?.subtitle ?? "",
            description: landing.hero?.description ?? "",
            image: heroImage,
            primaryCTA: {
              label: landing.hero?.primaryCTA?.label ?? "",
              url: landing.hero?.primaryCTA?.url ?? "#",
            },
            secondaryCTA: landing.hero?.secondaryCTA
              ? {
                  label: landing.hero.secondaryCTA.label ?? "",
                  url: landing.hero.secondaryCTA.url ?? "",
                }
              : null,
          }}
        />

        <AboutSection data={landing.about} />

        <HowItWorks
          data={{
            title: landing.howItWorks?.title ?? "",
            steps: (landing.howItWorks?.steps ?? []).map((step, index) => ({
              stepNumber: index + 1,
              title: step.title,
              description: step.description,
            })),
          }}
        />

        <Features
          data={{
            title: landing.features?.title ?? "",
            intro: landing.features?.intro ?? null,
            image: featuresImage,
            items: (landing.features?.items ?? []).map((item) => ({
              featureTitle: item.featureTitle,
              description: item.description ?? null,
            })),
          }}
        />

        <WhySamsam
          data={{
            title: landing.whySamsam?.title ?? "",
            description: landing.whySamsam?.description ?? null,
            image: whySamsamImage,
            reasons: (landing.whySamsam?.reasons ?? []).map((reason) => ({
              title: reason.title,
              description: reason.description ?? null,
            })),
          }}
        />

        <FAQ data={landing.faq} />

        <FinalCTA data={landing.finalCTA} />
      </main>

      <FooterWelcome />
    </div>
  )
}