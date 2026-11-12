import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, validAdmin } from '@/lib/admin-auth';
import LiveAdmin from '@/components/live-admin';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const jar = await cookies();
  if (!validAdmin(jar.get(ADMIN_COOKIE)?.value || '')) redirect('/admin/login');
  return <LiveAdmin />;
}
