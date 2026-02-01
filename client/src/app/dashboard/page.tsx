import type { Metadata } from "next";
import Squares from "@/components/landing/Squares";
import { getCurrentUser, requireAuth } from "@/auth/helper";
import DashboardView from "@/components/dashboard/DashboardView"; // Import the new client component
import { getDashboardData } from "@/lib/dashboard";
import Navbar from "@/components/landing/Navbar";
import Feedback from "@/components/landing/Feedback";
import Footer from "@/components/landing/Footer";
import { siteContent } from "@/app/content";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();
  const name = user?.username || user?.name || "Builder";
  return {
    title: `${name} - Dashboard | DevsArena`,
  };
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardData(user.id);

  return (
    <main className="relative min-h-screen  text-white selection:bg-cyan-500/30">
      <Squares
        className="fixed inset-0 z-0 opacity-[0.1] pointer-events-none"
        direction="diagonal"
        speed={0.2}
        borderColor="#333"
        hoverFillColor="#222"
        squareSize={40}
      />
      <Navbar />
      {/* Hand off to Client Component for UI state (Sidebar, Tabs, etc) */}
      <DashboardView user={user} data={data} />
      <Feedback content={siteContent.feedback} />
      <Footer {...siteContent.footer} />
    </main>
  );
}