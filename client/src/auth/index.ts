import NextAuth from "next-auth"
import Github from "next-auth/providers/github"
import { getPostHogClient } from "@/lib/posthog-server"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Github({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github") {
        try {
        console.log("DEBUG: CALLING THE INTERNAL API WITH", user)
          const response = await fetch(`${process.env.BACKEND_API_URL}/v0/auth/github`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
            },
            body: JSON.stringify({
              github_id: profile?.id?.toString(),
              username: profile?.login,
              email: user.email,
              avatar_url: user.image,
              bio: profile?.bio,
              github_url: profile?.html_url,
              name: user.name,
            }),
          });

          console.log("DEBUG: BACKEND RESPONSE", response)

          const data = await response.json();
          console.log("DEBUG: SYNCED USER", data)
          // Attach Postgres UUID to user object temporarily
          user.db_id = data.user_id;

          // Track user login with PostHog
          const posthog = getPostHogClient();
          posthog.capture({
            distinctId: data.user_id || user.email || profile?.login?.toString() || 'anonymous',
            event: 'user_logged_in',
            properties: {
              provider: 'github',
              username: profile?.login,
              email: user.email,
              isNewUser: data.is_new_user || false,
              source: 'oauth'
            }
          });

          // Identify user in PostHog
          posthog.identify({
            distinctId: data.user_id || user.email || profile?.login?.toString() || 'anonymous',
            properties: {
              email: user.email,
              name: user.name,
              username: profile?.login,
              avatar: user.image,
            }
          });

          return true;
        } catch (error) {
          console.error("Error syncing user:", error);
          return false;
        }
      }
      return true;
    },

    // 2. JWT: Persist Postgres UUID
    async jwt({ token, user, profile }) {
      if (user) {
        token.db_id = user.db_id;
        token.username = profile?.login as string;
      }
      return token;
    },

    // 3. SESSION: Expose UUID to frontend
async session({ session, token }) {
      if (session.user) {
        session.user.id = token.db_id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // Redirect here if unauthenticated
  },
})