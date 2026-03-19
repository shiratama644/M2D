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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
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
