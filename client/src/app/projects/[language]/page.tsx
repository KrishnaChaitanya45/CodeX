import Squares from "@/components/landing/Squares";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";
import {
  ProjectContainer,
  ProjectLoading,
} from "@/components/containers/ProjectsContainer";
import { Suspense } from "react";

export interface QuestMeta {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  category: {
    id: string;
    category: string;
  };
  techStack: Array<{
    id: string;
    name: string;
  }>;
  topics: Array<{
    id: string;
    name: string;
  }>;
  difficulty: {
    id: string;
    level: string;
  };
  createdAt: string;
  updatedAt: string;
}

const fetchProjects = async (language: string) => {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_URL + `/api/v1/experimental/projects/${language}`);

    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }

    const data = await response.json();

    if (data.success && data.projects) {
      return data.projects;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (err) {
    console.error("Error fetching projects:", err);
    throw new Error("FAILED TO LOAD PROJECTS");
  }
};

export default async function ExperimentalProjectsByLanguagePage({params}: {params: Promise<{language: string}>}) {
  try {
    const {language} = await params;

    let projects = await fetchProjects(language);

    if (projects instanceof Error) {
      throw new Error(projects.message);
    }

    return (
      <>
        <main className="relative min-h-screen text-white sm:px-6 lg:px-8 overflow-x-hidden">
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
            <ProjectContainer projects={projects} language={language} />
          </Suspense>
          <Footer
            tagline={siteContent.footer.tagline}
            socials={siteContent.footer.socials}
            copyright={siteContent.footer.copyright}
            builtBy={siteContent.footer.builtBy}
          />
        </main>
      </>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-4 text-center max-w-md"
        >
          <div className="text-red-400 text-6xl">⚠️</div>
          <h2 className="text-xl font-bold text-red-400">
            Error Loading Languages
          </h2>
          <p className="text-gray-400">Try Reloading the page !</p>
        </div>
      </div>
    );
  }
}
