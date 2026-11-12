'use client';

import { Phone, ShieldCheck, Wheat } from 'lucide-react';
import { BrandWord } from './brand-word';
import { emailLink, LEGAL_ENTITY, phoneLink, PUBLIC_PAGES } from '@/lib/store-profile';

export function SiteFooter({
  name,
  phone,
  email,
  address,
  onOrders,
}: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  onOrders?: () => void;
}) {
  const tel = phoneLink(phone);
  const mail = emailLink(email);
  const line = address?.trim();
  return (
    <footer>
      <div className="wrap footer-main">
        <div className="footer-brand">
          <a className="brand" href="/">
            <Wheat size={30} />
            <div>
              <BrandWord name={name} />
              <small>GOOD FOOD. GOOD LIVING.</small>
            </div>
          </a>
          <p className="footer-blurb">
            Everyday rice, atta, pulses, oil and other kitchen essentials. Prices in INR. Delivery
            in Anantnag district.
          </p>
          <p className="footer-legal">{LEGAL_ENTITY}</p>
        </div>
        <div className="footer-help">
          <strong>We are here to help</strong>
          {tel && (
            <a href={tel.href}>
              <Phone size={13} />
              {tel.display}
            </a>
          )}
          {mail && <a href={mail.href}>{mail.display}</a>}
          {line && <p className="footer-address">{line}</p>}
          <a href="/#shop">Shop essentials</a>
          {onOrders && (
            <button type="button" onClick={onOrders}>
              My orders
            </button>
          )}
        </div>
        <nav className="footer-links" aria-label="Policies">
          <strong>Policies</strong>
          {PUBLIC_PAGES.map((page) => (
            <a key={page.href} href={page.href}>
              {page.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="wrap footer-bottom">
        <span>
          © {new Date().getFullYear()} {name}. Rooted in goodness.
        </span>
        <span>
          Secure payments <b>UPI</b> <b>VISA</b> <b>RuPay</b> <ShieldCheck size={14} />
        </span>
      </div>
    </footer>
  );
}
