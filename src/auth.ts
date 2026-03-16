import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Augment next-auth types to include our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      onboardingComplete: boolean;
    };
  }

  interface User {
    role: Role;
    onboardingComplete: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ["state"],
      authorization: {
        params: {
          // Request calendar.events scope so we can create/delete events server-side
          scope:
            "openid profile email https://www.googleapis.com/auth/calendar.events",
          // offline access gives us a refresh_token for long-lived Calendar API access
          access_type: "offline",
          // Force consent screen on every login so refresh_token is always returned
          prompt: "consent",
        },
      },
    }),
  ],

  pages: {
    signIn: "/",
  },

  events: {
    async linkAccount({ user, account }) {
      console.log("[auth] linkAccount fired", { userId: user.id, provider: account.provider });
      if (account.provider === "google") {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            googleAccessToken: account.access_token ?? null,
            googleRefreshToken: account.refresh_token ?? null,
          },
        });
        console.log("[auth] linkAccount: tokens saved to user row");
      }
    },
  },

  callbacks: {
    async session({ session, user }) {
      console.log("[auth] session callback", { userId: user.id, email: user.email });
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: (user as { role: Role }).role,
          onboardingComplete: (user as { onboardingComplete: boolean })
            .onboardingComplete,
        },
      };
    },
  },
});
