import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ANANTNAG_ZONES,
  emailLink,
  phoneLink,
  PUBLIC_PAGES,
  storePhone,
} from '../lib/store-profile';
import { standardZones } from '../lib/delivery-zones';

test('public phone uses STORE_PHONE and never the sample number', () => {
  const previous = process.env.STORE_PHONE;
  try {
    delete process.env.STORE_PHONE;
    assert.equal(storePhone(), '');
    assert.equal(phoneLink(storePhone()), null);
    assert.equal(phoneLink('+91 194 245 0000'), null);
    assert.equal(phoneLink('01942450000'), null);
    process.env.STORE_PHONE = '9596327355';
    assert.deepEqual(phoneLink(storePhone()), {
      display: '+91 95963 27355',
      href: 'tel:+919596327355',
    });
    assert.deepEqual(phoneLink('+91 95963 27355'), phoneLink('9596327355'));
    assert.equal(emailLink(''), null);
    assert.equal(emailLink('not-an-email'), null);
    assert.equal(
      emailLink('sunrisesolution93@gmail.com')?.href,
      'mailto:sunrisesolution93@gmail.com',
    );
  } finally {
    if (previous === undefined) delete process.env.STORE_PHONE;
    else process.env.STORE_PHONE = previous;
  }
});

test('Anantnag delivery list has the 13 migrated pincodes', () => {
  assert.deepEqual(
    ANANTNAG_ZONES.map((zone) => zone.pincode),
    [
      '192101',
      '192122',
      '192124',
      '192125',
      '192126',
      '192129',
      '192201',
      '192202',
      '192210',
      '192211',
      '192212',
      '192221',
      '192401',
    ],
  );
  const zones = standardZones();
  assert.equal(zones.length, 13);
  assert.equal(zones[0].fee, 2500);
  assert.equal(zones[0].freeAbove, 50000);
  assert.equal(zones[0].codLimit, 500000);
});

test('the public storefront does not publish the sample phone, admin or the raw credits file', () => {
  const source = fs.readFileSync(new URL('../components/storefront.tsx', import.meta.url), 'utf8');
  const footer = fs.readFileSync(new URL('../components/site-footer.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('1942450000'), false);
  assert.equal(source.includes('/products/CREDITS.md'), false);
  assert.equal(source.includes('href="/admin"'), false);
  assert.equal(footer.includes('href="/admin"'), false);
  assert.ok(PUBLIC_PAGES.some((page) => page.href === '/credits'));
  assert.equal(
    PUBLIC_PAGES.map((page) => page.href).join(' '),
    '/about /contact /shipping-policy /refund-policy /terms /privacy /policies /credits',
  );
});
