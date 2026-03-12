import AboutUsContent from "../components/AboutUspage/AboutUsContent";
import FooterWelcome from "../components/landing/Footer/Footer";
import NavbarWelcome from "../components/landing/Navigation/Navigation";

export default function Page() {
  return (
    <>
      <NavbarWelcome />
      <AboutUsContent />
      <FooterWelcome />
    </>
  );
}