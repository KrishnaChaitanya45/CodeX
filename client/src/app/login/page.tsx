import Squares from "@/components/landing/Squares";
import TerminalHero from "@/components/landing/TerminalHero"; // Import the new component
import { siteContent } from "@/app/content";
import { login } from "@/auth/actions";
import { GitHub } from "@mui/icons-material"; // Icon for the button

export const metadata = {
  title: "Login | DevsArena",
  description: "Sign in to unlock your personalized DevsArena workspace and terminal access.",
};

export default function LoginPage() {
  const content = siteContent.login;

  return (
    <main className="relative min-h-screen text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Background Ambience */}
      <Squares
        className="absolute inset-0 z-0 opacity-[0.15]"
        direction="diagonal"
        speed={0.35}
        borderColor="#333"
        hoverFillColor="#222"
        squareSize={40}
      />
      
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] -z-10" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-20">
        
        {/* Left Side: Text & Action */}
        <section className="max-w-xl lg:flex-1 pt-10 lg:pt-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300 mb-6 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Secure access • GitHub sign-in
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl mb-6">
            Join the
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              {' Arena.'}
            </span>
          </h1>
          
          <p className="text-lg text-gray-400 leading-relaxed mb-8 max-w-lg">
            {content.body}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <form action={login} className="w-full sm:w-auto">
              <button className="group w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-black transition-all hover:bg-gray-100 hover:scale-[1.02] shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                <GitHub className="w-5 h-5" />
                {content.cta.label}
              </button>
            </form>
            
            <a href="/" className="text-sm font-medium text-gray-500 hover:text-white transition-colors px-4 py-2">
              Explore the platform →
            </a>
          </div>

          <p className="mt-8 text-xs text-gray-600">
            {content.highlight}
          </p>
        </section>

        {/* Right Side: The "Illustration" */}
        <section className="mt-16 lg:mt-0 lg:flex-1 w-full">
            <TerminalHero features={content.features} />
        </section>

      </div>
    </main>
  );
}