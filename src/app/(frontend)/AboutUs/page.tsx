import AboutUsContent from "../components/AboutUspage/AboutUsContent";
import FooterWelcome from "../components/landing/Footer/Footer";
import NavbarWelcome from "../components/landing/Navigation/Navigation";

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <>
      <NavbarWelcome />
      <AboutUsContent />
      <FooterWelcome />
    </>
  );
}