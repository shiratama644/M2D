import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      discordId?: string;
    } & DefaultSession['user'];
  }
}

// Validate required env vars at server runtime (skip during the build phase).
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    throw new Error(
      'Missing required environment variables: DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must be set',
    );
  }
}

const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: clientId!,
      clientSecret: clientSecret!,
      authorization: { params: { scope: 'identify email' } },
    }),
  ],
  pages: {
    signIn: '/account',
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.discordId === 'string') session.user.discordId = token.discordId;
      return session;
    },
    jwt({ token, account, profile }) {
      if (account?.provider === 'discord' && profile) {
        const discordProfile = profile as { id?: string };
        token.discordId = discordProfile.id;
      }
      return token;
    },
  },
});
