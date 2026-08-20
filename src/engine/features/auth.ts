import { signIn, signOut } from 'next-auth/react';
import type { Feature } from '../types';

export const authFeature: Feature = {
  id: 'auth',
  label: 'Authentication',
  mount(engine) {
    const offIn = engine.on('auth.signIn', () => {
      void signIn('discord', { callbackUrl: '/account' });
    });
    const offOut = engine.on('auth.signOut', () => {
      void signOut({ callbackUrl: '/' });
    });
    return () => {
      offIn();
      offOut();
    };
  },
};
