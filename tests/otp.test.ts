import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCustomerPhone, TwilioVerifyProvider, otpProvider } from '../lib/otp';
test('Indian account phones normalize consistently and reject invalid numbers', () => {
  for (const phone of ['9876543210', '+91 98765 43210', '919876543210', '(98765) 43210'])
    assert.equal(normalizeCustomerPhone(phone), '9876543210');
  for (const phone of ['1234567890', '98765', '+1 9876543210', '98765432101'])
    assert.throws(() => normalizeCustomerPhone(phone));
});
test('Twilio Verify sends to the verified destination and checks the provider verification SID', async () => {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const transport: typeof fetch = async (url, options) => {
    calls.push({ url: String(url), body: new URLSearchParams(String(options?.body)) });
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      'Basic ' + Buffer.from('ACfixture:secret-fixture').toString('base64'),
    );
    return Response.json(
      String(url).endsWith('/Verifications') ? { sid: 'VEfixture' } : { status: 'approved' },
    );
  };
  const provider = new TwilioVerifyProvider('ACfixture', 'secret-fixture', 'VAfixture', transport);
  const id = await provider.send('9876543210');
  assert.equal(id, 'VEfixture');
  assert.equal(calls[0].body.get('To'), '+919876543210');
  assert.equal(calls[0].body.get('Channel'), 'sms');
  assert.equal(await provider.verify('9876543210', id, '246810'), true);
  assert.equal(calls[1].body.get('VerificationSid'), id);
  assert.equal(calls[1].body.get('Code'), '246810');
  assert.equal(calls[1].url, 'https://verify.twilio.com/v2/Services/VAfixture/VerificationCheck');
});
test('provider rejection and outages cannot approve a code or leak provider errors', async () => {
  const denied = new TwilioVerifyProvider('ACfixture', 'secret-fixture', 'VAfixture', async () =>
    Response.json({ message: 'private provider diagnostic' }, { status: 404 }),
  );
  assert.equal(await denied.verify('9876543210', 'VEfixture', '123456'), false);
  await assert.rejects(
    () => denied.send('9876543210'),
    (e) => e instanceof Error && !e.message.includes('private'),
  );
  const unavailable = new TwilioVerifyProvider(
    'ACfixture',
    'secret-fixture',
    'VAfixture',
    async () => Response.json({ message: 'private provider diagnostic' }, { status: 503 }),
  );
  await assert.rejects(
    () => unavailable.verify('9876543210', 'VEfixture', '123456'),
    /temporarily unavailable/,
  );
  const saved = process.env.OTP_PROVIDER;
  try {
    process.env.OTP_PROVIDER = 'missing';
    assert.throws(() => otpProvider(), /not configured/);
  } finally {
    if (saved === undefined) delete process.env.OTP_PROVIDER;
    else process.env.OTP_PROVIDER = saved;
  }
});
