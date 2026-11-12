import { liveMode, storeName } from '@/lib/live-config';
import { storeAddress, storeEmail, storePhone } from '@/lib/store-profile';
import { customerAccountsEnabled } from '@/lib/customer-auth';
import Storefront from '@/components/storefront';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (
    <Storefront
      live={liveMode()}
      accountsEnabled={liveMode() && customerAccountsEnabled()}
      name={storeName()}
      phone={storePhone()}
      email={storeEmail()}
      address={storeAddress()}
    />
  );
}
