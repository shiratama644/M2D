import { auth } from '@/auth';
import AccountClient from '@/app/account/AccountClient';

export const metadata = {
  title: 'Account',
  description: 'Your M2D account page.',
};

export default async function AccountPage() {
  const session = await auth();
  return <AccountClient session={session} />;
}
