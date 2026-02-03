import Squares from "@/components/landing/Squares";import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";
import PlaygroundContainer from "@/components/containers/PlaygroundContainer"
export default function PlaygroundPage() {
  return (
   
  <main className="relative min-h-screen text-white px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        <Squares
          className="pointer-events-none"
          direction="diagonal"
          speed={0.35}
          borderColor="rgba(255,255,255,0.08)"
          hoverFillColor="rgba(124,58,237,0.12)"
          squareSize={34}
        />
        <Navbar />
        <PlaygroundContainer />
        <Footer
          tagline={siteContent.footer.tagline}
          socials={siteContent.footer.socials}
          copyright={siteContent.footer.copyright}
          builtBy={siteContent.footer.builtBy}
        />
      </main>

     
  );
}
