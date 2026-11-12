import { liveMode } from '@/lib/live-config';
import Storefront from '@/components/storefront';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <Storefront live={liveMode()} />;
}
