"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Plus, 
  X, 
  Search, 
  Terminal,
  Cpu,
  Send,
  AlertCircle, HardDrive
} from "lucide-react";
import { MobileSupportModal } from "@/components/common/MobileSupportModal";

type DashboardItem = {
  id: string;
  title: string;
  desc?: string;
  lang?: string;
  language?: string;
  projectSlug?: string;
  labType: "project" | "playground";
  icon: string;
  status: string;
  progress?: number;
  updatedAt: number;
};

type DashboardData = {
  playgrounds: DashboardItem[];
  projects: DashboardItem[];
  stats: {
    playgroundsUsed: number;
    playgroundsLimit: number;
    projectsUsed: number;
    projectsLimit: number;
  };
};

type ViewType = "projects" | "playgrounds" | null;

const formatRelativeTime = (value: number) => {
  if (!value) return "—";
  const timestamp = value > 1e12 ? value : value * 1000;
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60 * 1000) return "Just now";
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

export default function DashboardView({
  user,
  data,
}: {
  user: any;
  data: DashboardData;
}) {
  const [sidebarOpen, setSidebarOpen] = useState<ViewType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const displayName = user?.name?.split(" ")[0] || user?.username || "Builder";

  const sidebarItems = useMemo(() => {
    if (!sidebarOpen) return [];
    const items = sidebarOpen === "projects" ? data.projects : data.playgrounds;
    return items.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.desc || item.lang || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sidebarOpen, searchQuery, data.projects, data.playgrounds]);

  const handleStartLab = async (item: DashboardItem) => {
    if (isMobile) {
      setShowMobileModal(true);
      return;
    }
    if (actionLoadingId) return;
    setActionLoadingId(item.id);
    try {
      const isProject = item.labType === "project";
      const endpoint = isProject ? "/api/project/start" : "/api/playground/start";

      const payload = isProject
        ? {
            language: item.language || item.lang || "",
            projectSlug: item.projectSlug,
            labId: item.id,
          }
        : {
            language: item.language || item.lang || "",
            labId: item.id,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Failed to start lab", await res.json());
        return;
      }

      if (isProject) {
        if (item.language && item.projectSlug) {
          router.push(`/project/${item.language}/${item.projectSlug}/${item.id}`);
        }
      } else if (item.language) {
        router.push(`/playground/${item.language}/${item.id}`);
      }
    } catch (error) {
      console.error("Failed to start lab", error);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="relative mt-12 min-h-screen">
      <MobileSupportModal
        subtitle="Mobile lab support is arriving soon."
        message="We recommend using a desktop or laptop to start labs from your dashboard right now."
        secondaryLabel="Browse projects"
        secondaryHref="/projects"
        primaryLabel="Go back home"
        primaryHref="/"
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
      />
      {/* --- Main Content --- */}
      <div className={`relative z-10 mx-auto max-w-5xl px-6 py-12 transition-transform duration-500 ${sidebarOpen ? '-translate-x-10 opacity-50' : ''}`}>
        
        {/* Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Hello, {displayName} 👋</h1>
            <p className="mt-2 text-gray-400">Ready to build something new today?</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-gray-200 transition-colors shadow-lg shadow-white/5">
            <Plus size={18} /> New Project
          </button>
        </header>

        {/* Usage Stats & Pro Tip */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
           <UsageCard
             label="Active Sandboxes"
             used={data.stats.playgroundsUsed}
             total={data.stats.playgroundsLimit}
             emoji="💻"
           />
           <UsageCard
             label="Guided Projects"
             used={data.stats.projectsUsed}
             total={data.stats.projectsLimit}
             emoji="🚀"
           />
           
           {/* Fixed Pro Tip Alignment */}
           <div className="flex items-start gap-4 rounded-2xl border border-dashed border-white/10 bg-transparent p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-xl">
                💡
              </div>
              <div className="mt-0.5">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-yellow-200 font-semibold block mb-1">Pro tip</span> 
                  Idle labs auto-pause after 30 mins to save your quota.
                </p>
              </div>
           </div>
        </section>

        {/* Projects Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Your Projects</h2>
            <button 
              onClick={() => { setSidebarOpen("projects"); setSearchQuery(""); }}
              className="group flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-400 transition-colors"
            >
              View all <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.projects.slice(0, 2).map((project) => (
              <div key={project.id} className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#111217] via-[#0F0F11] to-black p-6 hover:border-white/20 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-inner">
                      {project.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-white group-hover:text-cyan-200 transition-colors">
                          {project.title}
                        </h3>
                        <StatusBadge status={project.status} mini />
                      </div>
                      <p className="text-sm text-gray-400">
                        {(project.desc || "").slice(0, 140)}
                        {project.desc && project.desc.length > 140 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                  {/* Fixed Alignment for Last Updated in Card */}
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Updated</span>
                    <span className="text-xs text-gray-300 font-mono">
                      {formatRelativeTime(project.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Checkpoint Progress</span>
                    <span className="text-white font-mono">{project.progress ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" 
                      style={{ width: `${project.progress ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-[11px] text-gray-500 font-mono">
                    Lab ID: {project.id}
                  </div>
                  <button
                    onClick={() => handleStartLab(project)}
                    disabled={actionLoadingId === project.id}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500/90 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {actionLoadingId === project.id ? "Starting..." : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Playgrounds Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Quick Sandboxes</h2>
            <button 
              onClick={() => { setSidebarOpen("playgrounds"); setSearchQuery(""); }}
              className="group flex items-center gap-1 text-sm text-gray-500 hover:text-cyan-400 transition-colors"
            >
              View all <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0F0F11] overflow-hidden">
             {data.playgrounds.slice(0, 3).map((lab, idx) => (
               <div 
                 key={lab.id} 
                 className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${idx !== 2 ? 'border-b border-white/5' : ''}`}
               >
                 <div className="flex items-center gap-4">
                   <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-white/5 text-xl">
                     {lab.icon}
                   </div>
                   <div>
                     <h4 className="text-sm font-medium text-white">{lab.id}</h4>
                     <p className="text-xs text-gray-500 font-mono">{lab.title || ""}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-6">
                   <div className="hidden sm:block text-right">
                     <p className="text-[10px] text-gray-500 uppercase tracking-wide">Last edited</p>
                     <p className="text-xs text-white">{formatRelativeTime(lab.updatedAt)}</p>
                   </div>
                   <button
                     onClick={() => handleStartLab(lab)}
                     disabled={actionLoadingId === lab.id}
                     className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                   >
                     {actionLoadingId === lab.id ? "Starting..." : "Open"}
                   </button>
                   <StatusBadge status={lab.status} />
                 </div>
               </div>
             ))}
          </div>
        </section>
        <section className="mt-16 border-t border-white/10 pt-10">
           <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] p-1 overflow-hidden">
              <div className="rounded-[20px] bg-black/40 p-8 md:p-12 relative overflow-hidden">
                 {/* Decorative */}
                 <div className="absolute top-0 right-0 p-4 opacity-20">
                    <HardDrive size={120} className="text-white rotate-12" />
                 </div>

                 <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 text-cyan-400 mb-4">
                       <AlertCircle size={16} />
                       <span className="text-xs font-mono tracking-widest uppercase">Capacity Warning</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Out of computing resources?</h3>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                      DevsArena manages resources strictly to ensure performance for all builders. 
                      If you have a specific use-case requiring more active containers or long-running processes, submit a requisition request below.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-3">
                       <div className="flex-1 relative group">
                          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                             <span className="text-gray-500 font-mono text-sm">{">"}</span>
                          </div>
                          <input 
                            type="text" 
                            placeholder="Reason for request (e.g. 'Need 2 more redis pods for scalable chat app')" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all font-mono"
                          />
                       </div>
                       <button className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 shadow-lg shadow-cyan-900/20">
                          <Send fontSize="small" /> Request Allocation
                       </button>
                    </form>
                    <p className="text-[10px] text-gray-600 mt-3 font-mono">
                      * Requests are manually reviewed by admin.
                    </p>
                 </div>
              </div>
           </div>
        </section>
      </div>

      {/* --- SIDEBAR OVERLAY --- */}
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(null)}
      />

      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/10 bg-[#0A0A0A] p-6 shadow-2xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-white capitalize flex items-center gap-2">
            {sidebarOpen === "projects" ? <Cpu size={24} className="text-purple-400"/> : <Terminal size={24} className="text-cyan-400"/>}
            All {sidebarOpen}
          </h2>
          <button 
            onClick={() => setSidebarOpen(null)}
            className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder={`Search ${sidebarOpen}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        {/* List Content */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 custom-scrollbar">
          {sidebarItems.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">No matches found.</p>
          ) : (
            sidebarItems.map((item: DashboardItem) => (
              <div key={item.id} className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="text-sm font-medium text-white group-hover:text-cyan-200 transition-colors">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc || item.lang}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={item.status} mini />
                  <p className="mt-1 text-[10px] text-gray-500">{formatRelativeTime(item.updatedAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// --- Helper Components ---

function UsageCard({ label, used, total, emoji }: any) {
  const isFull = used >= total;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
        {emoji}
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm font-medium text-white mb-1">
          <span>{label}</span>
          <span className={isFull ? "text-red-400" : "text-gray-400"}>{used}/{total}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div 
            className={`h-full rounded-full ${isFull ? 'bg-red-400' : 'bg-cyan-400'}`} 
            style={{ width: `${(used / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, mini }: { status: string, mini?: boolean }) {
  const styles = {
    Active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    Idle: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    Archived: "bg-gray-500/10 border-gray-500/20 text-gray-400",
    Completed: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  }[status] || "bg-gray-500/10 border-gray-500/20 text-gray-400";

  if (mini) {
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${styles}`}>
        {status}
      </span>
    );
  }

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] border ${styles}`}>
      {status}
    </span>
  );
}