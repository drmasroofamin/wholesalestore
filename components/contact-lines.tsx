import { emailLink, LEGAL_ENTITY, phoneLink, storeAddress } from '@/lib/store-profile';

export function ContactLines() {
  const tel = phoneLink(process.env.STORE_PHONE);
  const mail = emailLink(process.env.STORE_EMAIL);
  const address = storeAddress();
  return (
    <div className="contact-lines">
      <p>{LEGAL_ENTITY}</p>
      {tel && (
        <p>
          Phone: <a href={tel.href}>{tel.display}</a>
        </p>
      )}
      {mail && (
        <p>
          Email: <a href={mail.href}>{mail.display}</a>
        </p>
      )}
      {address && <p>Address: {address}</p>}
    </div>
  );
}
