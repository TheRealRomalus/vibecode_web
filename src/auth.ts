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
    // linkAccount fires after the OAuth account is linked to a User record in the DB.
    // Safe place to copy Google tokens onto the User row for server-side Calendar API calls.
    async linkAccount({ user, account }) {
      if (account.provider === "google") {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            googleAccessToken: account.access_token ?? null,
            googleRefreshToken: account.refresh_token ?? null,
          },
        });
      }
    },
  },

  callbacks: {
    // Attach custom fields to the session so server components and client hooks can read them
    async session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          // Explicitly pull from DB user so name/image always reflect the latest Google info
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
