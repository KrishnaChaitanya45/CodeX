"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react"; // <--- Use this for client-side auth
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

export default function Analytics() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageRef = useRef<{
    url: string;
    pathname: string;
    search: string;
    timestamp: number;
  } | null>(null);

  const buildCurrentUrl = () => {
    if (typeof window === "undefined") return "";
    const query = searchParams?.toString();
    return `${window.location.origin}${pathname || ""}${query ? `?${query}` : ""}`;
  };

  const capturePageLeave = (reason: "route-change" | "visibility" | "unload") => {
    const last = lastPageRef.current;
    if (!last) return;
    const durationMs = Math.max(0, Date.now() - last.timestamp);
    posthog.capture("$pageleave", {
      $current_url: last.url,
      $pathname: last.pathname,
      $search: last.search,
      reason,
      duration_ms: durationMs,
    });
  };

  // Track Page Views + Page Leaves (Anonymous & Auth)
  useEffect(() => {
    if (!pathname) return;

    // Fire leave for previous page on route change
    if (lastPageRef.current) {
      capturePageLeave("route-change");
    }

    const currentUrl = buildCurrentUrl();
    const currentSearch = searchParams?.toString() || "";
    posthog.capture("$pageview", {
      $current_url: currentUrl,
      $pathname: pathname,
      $search: currentSearch,
    });

    lastPageRef.current = {
      url: currentUrl,
      pathname,
      search: currentSearch,
      timestamp: Date.now(),
    };
  }, [pathname, searchParams]);

  // Capture page leave for tab close/background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        capturePageLeave("visibility");
      }
    };

    const handleBeforeUnload = () => {
      capturePageLeave("unload");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Identify User (Only when session loads)
  useEffect(() => {
    if (session?.user) {
      // Use a consistent ID (db_id preferred, fallback to email)
      // @ts-ignore
      const userId = session.user.db_id || session.user.id || session.user.email;
      if (userId) {
        // PostHog: Identify user (links anonymous browsing to this user)
        posthog.identify(userId, {
          email: session.user.email,
          name: session.user.name,
          avatar: session.user.image,
          // @ts-ignore
          username: session.user.username,
        });
      }
    }
  }, [session]);

  return null;
}