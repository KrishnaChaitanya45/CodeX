export type SiteContent = {
  hero: {
    headline: {
        type:string;
        text: Array<string> | string
    };
    subheadline: string;
    cta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    subtext: string;
  };
  guidedProjects: {
    title: string;
    body: string;
    bullets: { icon: string; label: string; description: string }[];
    tracksTitle: string;
    tracks: { label: string; status: string }[];
  };
  playgrounds: {
    title: string;
    body: string;
    features: { icon: string; label: string; description: string }[];
  };
  access: {
    title: string;
    body: string;
    tiers: { name: string; features: string[]; highlight?: boolean }[];
    note: string;
    footerCta: { label: string; href: string };
  };
  login: {
    title: string;
    body: string;
    highlight: string;
    features: { title: string; description: string }[];
    cta: { label: string; href: string };
  };
 feedback: {
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
    placeholder: string;
    button: { idle: string; loading: string; success: string };
    successMessage: string;
  };
};
  footer: {
    tagline: string;
    socials: { platform: string; url: string; icon: string }[];
    copyright: string;
    builtBy: string;
  };
};

export const siteContent: SiteContent = {
  hero: {
    headline: {
      type: "two-liner",
      text: ["Build Complex Software.", "One Checkpoint at a Time."]
    },
    subheadline:
      "Stop copying code from 10-hour videos. We provide the architecture and a roadmap broken into testable milestones. You write the code, debug the errors, and learn by making it work.",
    cta: { label: "Get Started", href: "/api/auth/github" },
    secondaryCta: { label: "See Guided Projects", href: "#guided-projects" },
    subtext: "No credit card required.",
  },
  guidedProjects: {
    title: "Code. Break. Debug. Deploy",
    body:
      "We built a custom test runner to drive your progress. You don't learn by consuming content; you learn by fixing failing builds and verifying your solution—one checkpoint at a time.",
    bullets: [
      {
        icon: "🗺️",
        label: "The Roadmap",
        description:
          "Tackle professional-grade specs (like 'Build a Trello Clone') broken down into logical milestones.",
      },
      {
        icon: "⚡",
        label: "The Engine",
        description:
          "Our in-house validation system checks your logic in real-time.",
      },
      {
        icon: "✅",
        label: "The Outcome",
        description:
          "You don't just write code; you prove it works.",
      },
    ],
    tracksTitle: "🚀 Available Tracks",
    tracks: [
      { label: "React JS", status: "Live" },
      { label: "Vanilla JS", status: "Live" },
      { label: "Node & Express", status: "Coming Soon" },
    ],
  },
  playgrounds: {
    title: "Instant Cloud Sandboxes.",
    body:
      "Launch fresh React, Node, or JS environments in seconds. No configuration, no version conflicts—just pure coding flow.",
    features: [
      {
        icon: "⚡",
        label: "Instant Spin-Up",
        description: "Fresh sandbox ready in seconds—no downloads, no config.",
      },
      {
        icon: "🔧",
        label: "Full Terminal Access",
        description:
          "Install packages, run scripts, and debug with complete shell access.",
      },
      {
        icon: "💾",
        label: "Auto-Persist State",
        description:
          "Your code, dependencies, and files stay exactly as you left them.",
      },
    ],
  },
  access: {
    title: "Built by Devs, For Devs.",
    body:
      "We're in Public Beta, building the ultimate developer experience. Join us and get free access to everything while we perfect the platform together.",
    tiers: [
      {
        name: "Public Beta Access",
        highlight: true,
        features: [
          "8 Active Playgrounds (2 per language)",
          "10 Guided Project Labs",
          "Full terminal & package manager access",
          "Auto-save & persistent environments",
          "Real-time test validation",
        ],
      },
    ],
    note:
      "💬 Building something massive? Need higher limits? Drop us a message—we're happy to support serious builders pushing the platform.",
    footerCta: { label: "Join via GitHub", href: "/api/auth/github" },
  },
  login: {
    title: "Join the Arena",
    body:
      "Unlock the full DevsArena experience with your own personalized cloud workspace. Registered members get the complete toolchain, persistent labs, and advanced project tracking.",
    highlight: "Everything here is private to you and saved automatically.",
    features: [
      {
        title: "Full Cloud Terminal",
        description: "Install packages, run scripts, and debug in a real shell—no local setup required.",
      },
      {
        title: "Guided Projects & Checkpoints",
        description: "Follow professional roadmaps and verify progress with checkpoint-based tests.",
      },
      {
        title: "Persistent Playgrounds",
        description: "Your code, dependencies, and state stay exactly as you left them.",
      },
      {
        title: "Private Workspaces",
        description: "Each lab runs in a secure, isolated environment built for serious builders.",
      },
    ],
    cta: { label: "Continue with GitHub", href: "/api/auth/github" },
  },
feedback: {
    badge: "Open Source & Community Driven",
    heading: "Built in Public.\nShaped by You.",
    description: "DevsArena isn't a black box. It's a living engine improved by the builders who use it. Don't just consume the platform—help forge it.",
    
    contribute: {
      title: "Contribute to Core",
      description: "Dive into the source code. Fix bugs, optimize the runner, or build entirely new guided project tracks.",
      cta: { label: "Star on GitHub", href: "https://github.com/KrishnaChaitanya45/codex" }
    },

    form: {
      title: "Direct Signal",
      subtitle: "No support tickets. No bots. Your message goes directly to the maintainer's terminal.",
      placeholder: "I wish DevsArena had...",
      button: {
        idle: "Send Signal",
        loading: "Transmitting...",
        success: "Signal Received"
      },
      successMessage: "Message received loud and clear. Thanks for helping us build."
    }
  },
  footer: {
    tagline: "Learn by building. One checkpoint at a time.",
    socials: [
      { platform: "GitHub", url: "https://github.com/KrishnaChaitanya45", icon: "github" },
      { platform: "Twitter", url: "https://x.com/KrishnaWyvern", icon: "twitter" },
    ],
    copyright: "© 2026 DevsArena. Built with 💜 by Krishna.",
    builtBy: "Krishna",
  },
};
