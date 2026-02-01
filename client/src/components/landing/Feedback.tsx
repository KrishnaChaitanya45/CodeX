"use client";

import { MessageSquare, Github, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

// Define interface for the props based on your content.ts structure
interface FeedbackContent {
  badge: string;
  heading: string;
  description: string;
  contribute: {
    title: string;
    description: string;
    cta: { label: string; href: string };
  };
  form: {
    title: string;
    subtitle: string;
    placeholder: string; // We can ignore this now
    button: { idle: string; loading: string; success: string }; // We'll use 'idle' for the button text
    successMessage: string; // We can ignore this now
  };
}

export default function Feedback({ content }: { content: FeedbackContent }) {
  return (
    <section className="relative w-full max-w-6xl mx-auto px-6 py-24">
      {/* Decorative Blob */}
      <div className="absolute left-0 bottom-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="grid lg:grid-cols-2 gap-16 items-center">
        
        {/* LEFT COLUMN: Context */}
        <div className="pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-300 mb-6">
            <Sparkles size={12} className="text-yellow-400" />
            <span>{content.badge}</span>
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight whitespace-pre-line">
            {content.heading}
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-md">
            {content.description}
          </p>

          {/* Contribute Card */}
          <Link
            href={content.contribute.cta.href}
            target="_blank"
            className="group block relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F11] transition-all hover:border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-5 flex items-center gap-5">
              <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Github className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  {content.contribute.title}
                </h3>
                <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                  {content.contribute.description}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* RIGHT COLUMN: PostHog Feedback Trigger */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-3xl blur opacity-30" />
          
          <div className="relative rounded-3xl border border-white/10 bg-[#0A0A0A] p-1 shadow-2xl">
            <div className="rounded-[20px] bg-white/[0.02] p-8 sm:p-10 backdrop-blur-sm flex flex-col items-center text-center">
              
              {/* Icon */}
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/5">
                <MessageSquare size={32} className="text-blue-400" />
              </div>

              {/* Text */}
              <h3 className="text-xl font-bold text-white mb-2">
                {content.form.title}
              </h3>
              <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                {content.form.subtitle}
              </p>

              {/* THE BUTTON LINKED TO POSTHOG */}
              <button
                id="feedback-button"
                className="group relative w-full sm:w-auto px-8 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <span>{content.form.button.idle}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <p className="mt-6 text-[10px] text-gray-600 uppercase tracking-widest">
                Direct to Developer • No Signup
              </p>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}