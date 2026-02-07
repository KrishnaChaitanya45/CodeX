import Image from "next/image";
import Link from "next/link";
import GitHubIcon from "@mui/icons-material/GitHub";

import { Button } from "@/components/ui/button";

export default function Footer({
    tagline,
    socials,
    copyright,
    builtBy,
}: {
    tagline: string;
    socials: { platform: string; url: string; icon: string }[];
    copyright: string;
    builtBy: string;
}) {
    return (
        <footer className="border-t border-white/10 bg-black/40 backdrop-blur-sm">
            <div className="mx-auto max-w-6xl px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Logo, Tagline, and Links */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Image
                                src="/logos/white.svg"
                                alt="DevsArena"
                                width={160}
                                height={36}
                                className="h-8 w-auto"
                            />
                            <p className="text-sm text-gray-400">{tagline}</p>
                        </div>

                        {/* Links as flex row */}
                        <nav className="flex flex-wrap gap-3">
                            <Link href="https://devsarena.in/blogs" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                                📝 Blog
                            </Link>
                            <Link href="https://devsarena.in/projects" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                                🚀 Projects
                            </Link>
                            <Link href="https://devsarena.in/playground" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                                ⚡ Playgrounds
                            </Link>
                        </nav>
                    </div>

                    {/* Socials and Copyright */}
                    <div className="space-y-6">
                        {/* Socials */}
                        <div className="flex items-center justify-center md:justify-end gap-3">
                            {socials.map((social) => (
                                <Button
                                    key={social.platform}
                                    asChild
                                    size="icon"
                                    variant="ghost"
                                    className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10"
                                >
                                    <Link
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.platform}
                                    >
                                        {social.icon === "github" ? (
                                            <GitHubIcon fontSize="small" />
                                        ) : social.icon === "twitter" ? (
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                        ) : null}
                                    </Link>
                                </Button>
                            ))}
                        </div>

                        {/* Copyright */}
                        <div className="space-y-1 text-center md:text-right">
                            <p className="text-sm text-gray-500">{copyright}</p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
