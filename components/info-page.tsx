import { Wheat } from 'lucide-react';
import { BrandWord } from './brand-word';
import { SiteFooter } from './site-footer';
import { liveMode, storeName } from '@/lib/live-config';
import { storeAddress, storeEmail, storePhone } from '@/lib/store-profile';

export function InfoPage({ children }: { children: React.ReactNode }) {
  const name = storeName();
  const live = liveMode();
  return (
    <>
      <header className="info-bar">
        <div className="wrap">
          <a className="brand" href="/" aria-label={`${name} home`}>
            <Wheat size={28} />
            <div>
              <BrandWord name={name} />
              <small>ROOTED IN GOODNESS</small>
            </div>
          </a>
          <nav aria-label="Store">
            <a href="/#shop">Shop</a>
            <a href="/contact">Contact</a>
            <a href="/policies">Policies</a>
          </nav>
        </div>
      </header>
      <main className="info-page wrap">
        {!live && (
          <p className="info-note">
            This deployment is a demonstration. It does not collect payment or dispatch a delivery.
          </p>
        )}
        {children}
      </main>
      <SiteFooter name={name} phone={storePhone()} email={storeEmail()} address={storeAddress()} />
    </>
  );
}
