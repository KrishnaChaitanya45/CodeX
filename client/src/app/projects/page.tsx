import Squares from "@/components/landing/Squares";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";
import {ProjectLanguagesContainer, ProjectLoading } from "@/components/containers/ProjectsContainer";
import { Suspense } from "react";

export interface Language {
  name: string;
  icon: string;
  description: string;
  color: string;
}

 const fetchLanguages = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_URL + '/api/v1/experimental/projects');
      
      if (!response.ok) {
        throw new Error('Failed to fetch languages');
      }
      
      const data = await response.json();
      
      if (data.success && data.languages) {
        // Map API response to Language objects with configuration
        const mappedLanguages: Language[] = data.languages
          .filter((langName: string) => langName.toLowerCase() !== 'html' && langName.toLowerCase() !== 'css')
          .map((langName: string) => {
            const name = langName.toLowerCase() === 'javascript' ? 'Vanilla JS' : langName;
            return {
              name,
              ...LANGUAGE_CONFIG[name.toLowerCase()] || {
          icon: "💻",
          description: `Projects using ${name}`,
          color: "border-gray-500/20 hover:border-gray-500/50"
              }
            };
          });
        return mappedLanguages
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching languages:', err);
      return new Error("SOMETHING WENT WRONG")
    } 
  };

// Language configuration with icons and colors
const LANGUAGE_CONFIG: Record<string, Omit<Language, 'name'>> = {
  react: {
    icon: "⚛️",
    description: "Build interactive user interfaces with React",
    color: "border-blue-500/20 hover:border-blue-500/50"
  },

  javascript: {
    icon: "🟨",
    description: "Vanilla JavaScript, includes projects for ( HTML, CSS and JS )",
    color: "border-yellow-400/20 hover:border-yellow-400/50"
  },
  
  node: {
    icon: "🟢",
    description: "JavaScript runtime for server-side development",
    color: "border-green-600/20 hover:border-green-600/50"
  },

};

export default async function ExperimentalProjectsPage() {
try {
   const languages = await fetchLanguages();
   if(languages instanceof Error) {
    throw new Error(languages.message)
   }
  return (
    <main className="relative min-h-screen text-white">
      <Squares
        className="pointer-events-none"
        direction="diagonal"
        speed={0.35}
        borderColor="rgba(255,255,255,0.08)"
        hoverFillColor="rgba(124,58,237,0.12)"
        squareSize={34}
      />
      <Navbar />
      <Suspense fallback={<ProjectLoading />}>
      <ProjectLanguagesContainer languages={languages} />
      </Suspense>
      <Footer
        tagline={siteContent.footer.tagline}
        socials={siteContent.footer.socials}
        copyright={siteContent.footer.copyright}
        builtBy={siteContent.footer.builtBy}
      />
    </main>
  );
} catch (error) {
     return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-4 text-center max-w-md"
        >
          <div className="text-red-400 text-6xl">⚠️</div>
          <h2 className="text-xl font-bold text-red-400">Error Loading Languages</h2>
          <p className="text-gray-400">Try Reloading the page !</p>

        </div>
      </div>
    );
}
   


 





}