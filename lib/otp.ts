import { StoreError } from './live-config';
export function normalizeCustomerPhone(input: string) {
  const cleaned = input.replace(/[\s()-]/g, '');
  const phone = cleaned.startsWith('+91')
    ? cleaned.slice(3)
    : cleaned.length === 12 && cleaned.startsWith('91')
      ? cleaned.slice(2)
      : cleaned;
  if (!/^[6-9][0-9]{9}$/.test(phone))
    throw new StoreError('Enter a valid 10-digit Indian mobile number');
  return phone;
}
export function otpConfigured() {
  return (
    process.env.OTP_PROVIDER === 'twilio' &&
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_VERIFY_SERVICE_SID
  );
}
export interface OtpProvider {
  send(phone: string): Promise<string>;
  verify(phone: string, verificationId: string, code: string): Promise<boolean>;
}
export class TwilioVerifyProvider implements OtpProvider {
  constructor(
    private account: string,
    private token: string,
    private service: string,
    private transport: typeof fetch = fetch,
  ) {}
  private async call(path: string, body: URLSearchParams) {
    const response = await this.transport(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(this.service)}/${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(this.account + ':' + this.token).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (path === 'VerificationCheck' && [400, 404].includes(response.status))
        return { status: 'invalid' };
      throw new StoreError(
        'SMS verification is temporarily unavailable. Please try again later.',
        503,
      );
    }
    return data;
  }
  async send(phone: string) {
    const data = await this.call(
      'Verifications',
      new URLSearchParams({ To: '+91' + phone, Channel: 'sms' }),
    );
    if (typeof data.sid !== 'string' || !/^VE[A-Za-z0-9]+$/.test(data.sid))
      throw new StoreError('Unable to request the verification code', 503);
    return data.sid;
  }
  async verify(_phone: string, id: string, code: string) {
    const data = await this.call(
      'VerificationCheck',
      new URLSearchParams({ VerificationSid: id, Code: code }),
    );
    return data.status === 'approved';
  }
}
export function otpProvider(): OtpProvider {
  if (!otpConfigured())
    throw new StoreError('Phone sign-in is not configured yet. Please contact the store.', 503);
  return new TwilioVerifyProvider(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
    process.env.TWILIO_VERIFY_SERVICE_SID!,
  );
}
