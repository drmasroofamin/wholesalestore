import { storeName } from '@/lib/live-config';
import AdminLogin from '@/components/admin-login';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <AdminLogin name={storeName()} />;
}
