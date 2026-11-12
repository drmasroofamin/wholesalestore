import { redirect } from 'next/navigation';
import { liveMode, storeName } from '@/lib/live-config';
import AdminDemo from '@/components/admin-demo';
export const dynamic = 'force-dynamic';
export default function Admin() {
  if (liveMode()) redirect('/admin/live');
  return <AdminDemo name={storeName()} />;
}
