// app/(frontend)/page.tsx
import { getPayload } from 'payload'
import config from '@payload-config'


import HeroSection from './components/landing/Hero/Hero'
import AboutSection from './components/landing/About/AboutSection'
import HowItWorks from './components/landing/HowItWork/HowItWork'
import Features from './components/landing/Features/Features'
import WhySamsam from './components/landing/WhySamSam/whySamSam'
import styles from './page.module.css'
import NavbarWelcome from './components/landing/Navigation/Navigation'
import FooterWelcome from './components/landing/Footer/Footer'
import FAQ from './components/landing/FAQ/FAQ'
import FinalCTA from './components/landing/FinalCTA/FinalCTA'


export default async function LandingPage() {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'landingPage',
    limit: 1,
    depth: 2,
  })

  const landing = result.docs[0]

  if (!landing) {
    return <p>Landing page content not found.</p>
  }

  return (
    <div className={styles.page}>
      <NavbarWelcome />

      <main className={styles.main}>
        <HeroSection
          data={{
            ...landing.hero,
            image: {
              url:
                typeof landing.hero.image === 'object' && landing.hero.image?.url
                  ? landing.hero.image.url
                  : '',
            },
          }}
        />

        <AboutSection data={landing.about} />
        <HowItWorks
          data={{
            title: landing.howItWorks.title,
            steps: (landing.howItWorks.steps ?? []).map((step, index) => ({
              stepNumber: index + 1,
              title: step.title,
              description: step.description,
            })),
          }}
        />

        <Features
  data={{
    title: landing.features.title,
    intro: landing.features.intro ?? null,
    image: {
      url:
        typeof landing.features.image === "object" && landing.features.image?.url
          ? landing.features.image.url
          : "",
    },

    items: (landing.features.items ?? []).map((item) => ({
      featureTitle: item.featureTitle,
      description: item.description ?? null,
    })),
  }}
/>

        <WhySamsam
          data={{
            title: landing.whySamsam.title,
            description: landing.whySamsam.description ?? null, // nếu bạn có field này
            reasons: (landing.whySamsam.reasons ?? []).map((r) => ({
              title: r.title,
              description: r.description,
            })),
          }}
        />

        <FAQ data={landing.faq} />

        <FinalCTA data={landing.finalCTA}/>

       

      
      </main>

      <FooterWelcome/>
    </div>
  )
}
