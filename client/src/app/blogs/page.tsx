import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Squares from "@/components/landing/Squares";
import { Github, Twitter, Globe, Linkedin } from "lucide-react";
import { blogPosts, BlogBlock, BlogSection, TextHighlight, BlogPost } from "./blog";
import { siteContent } from "../content";

export const metadata: Metadata = {
  title: "Blog",
  description: "Product notes, engineering stories, and the DevsArena journey.",
  alternates: { canonical: "/blogs" },
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const getHeadingId = (sectionId: string, heading: string) =>
  `${sectionId}-${slugify(heading)}`;

const getCalloutStyles = (tone?: "info" | "success" | "warning" | "neutral") => {
  switch (tone) {
    case "success":
      return "border-emerald-500/20 bg-emerald-500/5 text-emerald-200 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]";
    case "warning":
      return "border-amber-500/20 bg-amber-500/5 text-amber-200 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]";
    case "neutral":
      return "border-slate-700 bg-slate-800/50 text-slate-300";
    case "info":
    default:
      return "border-blue-500/20 bg-blue-500/5 text-blue-200 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]";
  }
};

const renderTextWithHighlights = (text: string, keywordMap?: Record<string, TextHighlight>, tracker?: Set<string>) => {
  if (!keywordMap) return text;

  const validKeywords = Object.entries(keywordMap)
    .filter(([key, config]) => {
      // If globally tracked as "done", skip it
      if (config.once && tracker?.has(key)) return false;
      return true;
    })
    .map(([key]) => key)
    .sort((a, b) => b.length - a.length);

  if (validKeywords.length === 0) return text;

  // Escape special chars for regex
  const safeKeywords = validKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${safeKeywords.join("|")})`, "g");

  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) => {
        const highlight = keywordMap[part];
        if (highlight) {
          // Double-check: if it was marked as "once" and we just added it to tracker in a previous iteration of THIS loop?
          // Or if it was already in tracker (should be filtered out by validKeywords, but validKeywords only affects the regex split).
          // If the regex matched it, it's here.
          
          if (highlight.once && tracker?.has(part)) {
             return <span key={index}>{part}</span>;
          }

          if (highlight.once && tracker) {
            tracker.add(part);
          }

          if (highlight.type === "link" && highlight.url) {
            return (
              <Link
                key={index}
                href={highlight.url}
                target="_blank"
                className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 decoration-blue-500/30 underline-offset-4 transition-all ${highlight.className || ""}`}
              >
                {part}
              </Link>
            );
          }
          if (highlight.type === "highlight-marker") {
            return (
              <span
                key={index}
                className={`relative inline-block mx-1 px-2 py-0 rounded-sm bg-[#ffea00] text-black font-extrabold transform -rotate-1 decoration-clone shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:rotate-1 hover:scale-110 transition-transform duration-200 cursor-default ${highlight.className || ""}`}
              >
                {part}
              </span>
            );
          }
           if (highlight.type === "highlight-code") {
            return (
              <code
                key={index}
                className={`mx-1 rounded-md px-2 py-0.5 bg-fuchsia-500/10 text-fuchsia-300 font-mono text-[0.9em] border border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.1)] ${highlight.className || ""}`}
              >
                {part}
              </code>
            );
          }
        }
        return part;
      })}
    </>
  );
};

const renderBlock = (block: BlogBlock, sectionId: string, keywordMap?: Record<string, TextHighlight>, tracker?: Set<string>) => {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 2;
      const headingId = getHeadingId(sectionId, block.text);
      const HeadingTag = level === 3 ? "h3" : "h2";
      return (
        <HeadingTag id={headingId} className="scroll-mt-28">
          {block.text}
        </HeadingTag>
      );
    }
    case "paragraph":
      return <p className="text-base leading-relaxed text-gray-200 sm:text-lg sm:leading-loose text-justify">{renderTextWithHighlights(block.text, keywordMap, tracker)}</p>;
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className="space-y-3 text-base leading-relaxed sm:text-lg ml-4">
          {block.items.map((item: string, i: number) => (
            <li key={i} className="text-gray-200 pl-2 marker:text-gray-500">
              {renderTextWithHighlights(item, keywordMap, tracker)}
            </li>
          ))}
        </ListTag>
      );
    }
    case "quote":
      return (
        <figure className="rounded-3xl border border-primary-400/40 bg-gradient-to-br from-primary-500/20 via-purple-500/10 to-pink-500/10 px-8 py-6 shadow-[0_0_40px_rgba(124,58,237,0.2)]">
          <div className="mb-4 text-4xl text-primary-300">💭</div>
          <blockquote className="text-xl font-medium leading-relaxed text-white sm:text-2xl">"{renderTextWithHighlights(block.text, keywordMap, tracker)}"</blockquote>
          {block.caption ? (
            <figcaption className="mt-4 text-base text-gray-300">{renderTextWithHighlights(block.caption, keywordMap, tracker)}</figcaption>
          ) : null}
        </figure>
      );
    case "image":
      return (
        <figure className="space-y-4 my-8">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl">
            <img
              src={block.src}
              alt={block.alt}
              className="w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
          {block.caption ? (
            <figcaption className="text-center text-sm text-gray-400 italic px-4 border-l-2 border-primary-500/30 ml-4 py-1">
              {renderTextWithHighlights(block.caption, keywordMap, tracker)}
            </figcaption>
          ) : null}
        </figure>
      );
    case "code":
      return (
        <div className="relative my-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl group/code hover:border-primary-500/30 transition-colors">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-2.5">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            {block.language ? (
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 py-0.5 rounded bg-white/5">
                {block.language}
              </span>
            ) : null}
          </div>
          <div className="overflow-x-auto p-5 scrollbar-thin scrollbar-thumb-primary-500/20 scrollbar-track-transparent">
            <pre className="font-mono text-sm leading-7 text-gray-300 min-w-full">
              {block.text}
            </pre>
          </div>
        </div>
      );
    case "divider":
      return <hr className="border-white/10 my-12" />;
    case "callout":
      const emoji = block.tone === "success" ? "✨" : block.tone === "warning" ? "⚠️" : block.tone === "neutral" ? "📝" : "💡";
      return (
        <div
          className={`rounded-3xl border px-8 py-6 text-base leading-relaxed ${getCalloutStyles(block.tone)}`}
        >
          <div className="mb-3 flex items-start gap-4">
            <span className="text-2xl mt-1">{emoji}</span>
            <div className="flex-1">
              {block.title ? <h4 className="mb-2 text-lg font-semibold tracking-wide">{block.title}</h4> : null}
              <p className="leading-relaxed">{renderTextWithHighlights(block.text, keywordMap, tracker)}</p>
            </div>
          </div>
        </div>
      );
    case "link":
      return (
        <Link
          href={block.href}
          target="_blank"
          rel="noreferrer"
          className="group block rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 px-8 py-6 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition hover:border-primary-400/50 hover:from-primary-500/20 hover:to-purple-500/10 hover:shadow-[0_0_40px_rgba(124,58,237,0.2)]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl group-hover:bg-primary-500/20 transition-colors">🔗</div>
            <div>
              <div className="text-lg font-semibold text-white group-hover:text-primary-200">
                {block.label}
              </div>
              {block.description ? <p className="mt-1 text-base leading-relaxed text-gray-300">{block.description}</p> : null}
            </div>
          </div>
        </Link>
      );
    default:
      return null;
  }
};

const collectSectionHeadings = (section: BlogSection) =>
  section.blocks
    .filter((block: BlogBlock) => block.type === "heading" && (block.level ?? 2) === 3)
    .map((block: BlogBlock) => ({
      id: getHeadingId(section.id, (block as BlogBlock & { type: "heading" }).text),
      label: (block as BlogBlock & { type: "heading" }).text,
    }));

export default function BlogsPage() {
  const post: BlogPost = blogPosts[0];
  const tracker = new Set<string>();
  const toc = post.sections.map((section: BlogSection) => ({
    id: section.id,
    title: section.title,
    subHeadings: collectSectionHeadings(section),
  }));

  // Extract resources from keywordMap for the "Resources" map
  const resources = post.keywordMap 
    ? Object.entries(post.keywordMap)
        .filter(([_, highlight]: [string, TextHighlight]) => highlight.type === "link")
        .sort((a, b) => a[0].localeCompare(b[0]))
    : [];

  return (
    <main className="relative min-h-screen  text-gray-100  overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-50 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-blue-900/10 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-900/10 blur-[100px] mix-blend-screen" />
      </div>
      
      <Squares
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.15]"
        direction="diagonal"
        speed={0.15}
        borderColor="#333"
        hoverFillColor="#222"
        squareSize={40}
      />

      <div className="relative z-10">
        <Navbar />

        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-32 pb-16">
           <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-cyan-500/80 mb-8 animate-fade-in font-mono">
            <span className="rounded-sm bg-cyan-950/50 border border-cyan-800/50 px-3 py-1.5 backdrop-blur-sm shadow-[0_0_10px_rgba(34,211,238,0.1)]">Engineering</span>
            <span className="h-px w-8 bg-cyan-900/50"></span>
            <span className="text-gray-400">{post.date}</span>
          </div>

          <h1 className="text-5xl font-black tracking-tighter text-white sm:text-7xl lg:text-8xl mb-8 leading-[0.9]">
            <span className="bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent drop-shadow-sm">
              {post.title}
            </span>
          </h1>

          <p className="max-w-3xl text-xl leading-relaxed text-gray-400 sm:text-2xl font-light mb-12 border-l-4 border-cyan-500/80 pl-8 py-2">
            {post.description}
          </p>

          <div className="flex flex-wrap items-center gap-6">
             <div className="flex items-center gap-4 pr-6 border-r border-white/10">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 p-0.5 shadow-lg bg-black">
                   <img src={post.author.avatar!} alt={post.author.name} className="h-full w-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                </div>
                <div>
                   <p className="font-bold text-gray-200 text-sm tracking-wide uppercase">{post.author.name}</p>
                   <p className="text-cyan-500 text-xs font-mono mt-0.5">{post.author.title}</p>
                </div>
             </div>
             <div className="flex gap-2.5">
                {post.tags.map((tag: string) => (
                   <span key={tag} className="px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 transition-all cursor-default hover:text-white">
                      {tag}
                   </span>
                ))}
             </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent my-8" />

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-4 pb-32 sm:px-6 lg:grid-cols-[1fr_280px]">
          {/* Main Content */}
          <article className="min-w-0">
            {post.sections.map((section: BlogSection, idx: number) => {
              const sectionNumber = (idx + 1).toString().padStart(2, '0');
              return (
                <section key={section.id} id={section.id} className="group relative mb-24 scroll-mt-32">
                  <div className="absolute -left-4 top-0 -z-10 h-full w-1 border-l border-dashed border-white/5 lg:-left-12"></div>
                  
                  <div className="mb-8 flex items-end gap-4 border-b border-white/5 pb-4">
                     <span className="text-6xl font-black text-white/10 select-none tracking-tighter font-mono">{sectionNumber}</span>
                     <div className="relative pb-1">
                        <h2 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
                           <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                            {section.title}
                           </span>
                        </h2>
                     </div>
                  </div>
                   {section.summary && (
                      <p className="mb-8 mt-4 text-lg text-gray-400 font-serif italic pl-4 border-l-2 border-cyan-500/30">
                         {section.summary}
                      </p>
                   )}

                  <div className="prose prose-invert prose-lg max-w-none text-gray-300 prose-headings:font-bold prose-headings:text-white prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300 prose-strong:text-white prose-p:leading-8 prose-li:marker:text-cyan-500">
                    {section.blocks.map((block: BlogBlock, index: number) => {
                      const mergedMap = { ...(post.keywordMap || {}), ...(section.keywordMap || {}) };
                      return (
                        <div key={`${section.id}-${index}`} className="my-8">
                          {renderBlock(block, section.id, mergedMap, tracker)}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </article>

          {/* New Unique "Journey Map" Sidebar */}
          <aside className="hidden lg:block h-fit sticky top-32">
             <div className="relative pl-6">
                {/* Timeline Line */}
                <div className="absolute left-[3px] top-4 bottom-4 w-px bg-gradient-to-b from-primary-500/50 via-white/10 to-transparent"></div>

                <div className="space-y-12">
                   {/* Journey Map Section */}
                   <div>
                      <h3 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-bold mb-6 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                         Journey Map
                      </h3>
                      <nav>
                         <ul className="space-y-6 relative">
                            {toc.map((item: any, idx: number) => (
                               <li key={item.id} className="relative group">
                                  <a href={`#${item.id}`} className="flex items-start gap-4 transition-all duration-300 hover:translate-x-1">
                                     <span className="relative z-10 mt-1.5 h-2 w-2 rounded-full border border-gray-600 bg-gray-900 transition-colors duration-300 group-hover:border-primary-400 group-hover:bg-primary-500">
                                        <span className="absolute inset-0 rounded-full bg-primary-500 opacity-0 blur group-hover:opacity-50 transition-opacity"></span>
                                     </span>
                                     <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors duration-200">
                                        {item.title}
                                     </span>
                                  </a>
                               </li>
                            ))}
                         </ul>
                      </nav>
                   </div>

                   {/* Resources Map Section removed as per request */}
                   
                   {/* Socials Connection */}
                   <div className="pt-8 border-t border-white/5">
                      <p className="text-xs text-gray-500 mb-4 font-mono uppercase tracking-wider">Connect</p>
                      <div className="flex gap-3">
                         {post.author.socials?.map((social: {label: string, href: string}) => {
                            const Icon = social.label === "GitHub" ? Github : social.label === "Twitter" ? Twitter : social.label === "LinkedIn" ? Linkedin : Globe;
                            return (
                               <Link 
                                  key={social.href}
                                  href={social.href}
                                  target="_blank"
                                  className="group relative p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 transition-all text-gray-400 hover:text-cyan-400"
                               >
                                  <span className="sr-only">{social.label}</span>
                                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                               </Link>
                            );
                         })}
                      </div>
                   </div>
                </div>
             </div>
          </aside>
        </section>

        <Footer
          tagline={siteContent.footer.tagline}
          socials={siteContent.footer.socials}
          copyright={siteContent.footer.copyright}
          builtBy={siteContent.footer.builtBy}
        />
      </div>
</main>
  )
}