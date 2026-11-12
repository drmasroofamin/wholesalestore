import { test, expect } from '@playwright/test';
import { products } from '../../lib/catalog';

test('empty delivery slots are explained and refresh recovers without clearing checkout', async ({
  page,
}) => {
  let slots: { id: string; label: string }[] = [];
  await page.route('**/api/store*', (route) =>
    route.fulfill({
      json: {
        live: true,
        name: 'Slot Verification Store',
        phone: '9999999999',
        district: 'Anantnag district',
        acceptingOrders: true,
        onlinePayments: false,
        paymentTestMode: false,
        products,
        zones: [{ pincode: '192210', fee: 3900, freeAbove: 99900, codLimit: 2500000 }],
        slots,
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search products' }).fill('Basmati');
  await page.getByRole('button', { name: 'ADD', exact: true }).click();
  await page.getByRole('button', { name: /My cart/ }).click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.getByRole('combobox', { name: 'Delivery slot', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('status').filter({ hasText: 'No delivery slots are available' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeDisabled();
  await page.getByLabel('Your name').fill('Slot Verification Customer');
  await page.getByLabel('Delivery address').fill('Verification address in Anantnag');
  slots = [{ id: 'slot-available', label: 'Tomorrow, 10 AM – 1 PM' }];
  await page.getByRole('button', { name: 'Refresh delivery slots' }).click();
  await expect(page.getByRole('combobox', { name: 'Delivery slot', exact: true })).toBeEnabled();
  await page
    .getByRole('combobox', { name: 'Delivery slot', exact: true })
    .selectOption('slot-available');
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Your name')).toHaveValue('Slot Verification Customer');
  await expect(page.getByLabel('Delivery address')).toHaveValue('Verification address in Anantnag');
  // A slot that fills or passes cutoff is removed rather than silently submitted.
  slots = [];
  await page.getByRole('button', { name: 'Refresh delivery slots' }).click();
  await expect(page.getByRole('combobox', { name: 'Delivery slot', exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Delivery slot', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeDisabled();
});

test('failed store refresh keeps cart prices and recovery preserves saved items', async ({
  page,
}) => {
  let unavailable = true;
  const cached = products.map((p) => ({ ...p, stock: 0 }));
  await page.addInitScript(
    ({ catalogue }) => {
      localStorage.setItem('gg-cart', JSON.stringify({ basmati: 1 }));
      localStorage.setItem('gg-public-catalogue', JSON.stringify(catalogue));
    },
    { catalogue: cached },
  );
  await page.route('**/api/store*', (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { error: 'The store is temporarily unavailable. Please try again.' },
        })
      : route.fulfill({
          json: {
            live: true,
            name: 'Slot Test',
            phone: '9999999999',
            district: 'Anantnag district',
            acceptingOrders: true,
            onlinePayments: false,
            paymentTestMode: false,
            products,
            zones: [{ pincode: '192210', fee: 2500, freeAbove: 50000, codLimit: 2500000 }],
            slots: [{ id: 'slot-recovered', label: 'Tomorrow, 10 AM – 1 PM' }],
          },
        }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /My cart/ }).click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.locator('.checkout-total')).toContainText('₹649');
  await expect(page.locator('.checkout-total')).toContainText('Estimated total');
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeDisabled();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gg-cart') || '{}').basmati),
  ).toBe(1);
  await page.getByLabel('Pincode', { exact: true }).fill('192210');
  await expect(
    page.getByText('This pincode is valid, but delivery is not currently available there.', {
      exact: false,
    }),
  ).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Refresh delivery slots' }).click();
  await page
    .getByRole('combobox', { name: 'Delivery slot', exact: true })
    .selectOption('slot-recovered');
  await expect(page.locator('.checkout-total')).toContainText('₹649');
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeEnabled();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gg-cart') || '{}').basmati),
  ).toBe(1);
});

test('an empty catalogue does not erase saved cart items or display a zero checkout total', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('gg-cart', JSON.stringify({ basmati: 1 })));
  await page.route('**/api/store*', (route) =>
    route.fulfill({
      json: {
        live: true,
        name: 'Slot Test',
        phone: '9999999999',
        district: 'Anantnag district',
        acceptingOrders: true,
        onlinePayments: false,
        paymentTestMode: false,
        products: [],
        zones: [],
        slots: [],
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /My cart/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Product unavailable in current catalogue');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gg-cart') || '{}').basmati),
  ).toBe(1);
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.locator('.checkout-total')).toContainText('Total unavailable');
  await expect(page.locator('.checkout-total')).not.toContainText('₹0');
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeDisabled();
});
