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
