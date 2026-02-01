"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Terminal, ChevronRight, Laptop } from "lucide-react"; // Assuming you have lucide-react or use similar icons

export default function TerminalHero({ features }: { features: any[] }) {
  const [activeStep, setActiveStep] = useState(0);

  // Simple animation loop to "type" out the features
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < features.length ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <div className="relative w-full max-w-lg mx-auto lg:mr-0">
      {/* Glow Effect Behind */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-30 animate-pulse" />
      
      {/* Main Terminal Window */}
      <div className="relative rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl overflow-hidden font-mono text-sm">
        
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-4 text-xs text-gray-500 flex items-center gap-1.5">
            <Laptop size={12} />
            <span>devsarena-shell — -zsh</span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-6 space-y-4 min-h-[320px]">
          <div className="text-gray-400">
            <span>Last login: {new Date().toLocaleDateString()} on ttys001</span>
            <br />
            <span className="text-emerald-400">➜</span> <span className="text-cyan-300">~</span> <span className="text-white">init_workspace --user=guest</span>
          </div>

          {/* Dynamic Feature List as "Boot Sequence" */}
          <div className="space-y-3 mt-4">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className={`transition-all duration-500 ${
                  index <= activeStep ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {index < activeStep ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-emerald-500 animate-spin" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 font-semibold">{feature.title}</span>
                      {index === activeStep && <span className="w-1.5 h-4 bg-emerald-500 animate-pulse"/>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-sans leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Success Message */}
            {activeStep >= features.length && (
              <div className="pt-4 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                   <span>✓ Environment Ready</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Decorative "floating" element */}
      <div className="absolute -bottom-6 -right-6 -z-10 text-[10rem] font-bold text-white/5 select-none leading-none overflow-hidden">
        {"/>"}
      </div>
    </div>
  );
}