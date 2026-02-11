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
            items: (landing.features.items ?? []).map((item) => ({
              featureTitle: item.featureTitle,
              points: (item.points ?? []).map((p) => ({ text: p.text })), // loại bỏ id, đảm bảo luôn là mảng
            })),
          }}
        />

        <WhySamsam
          data={{
            ...landing.whySamsam,
            image: {
              url:
                typeof landing.whySamsam.image === 'object' && landing.whySamsam.image?.url
                  ? landing.whySamsam.image.url
                  : '',
            },
            reasons: (landing.whySamsam.reasons ?? []).map((r) => ({
              title: r.title,
              description: r.description,
            })),
          }}
        />

      
      </main>

      <FooterWelcome/>
    </div>
  )
}
