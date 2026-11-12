import { createHmac, randomUUID } from 'node:crypto';
import { cacheKey, redis } from './security';
import { StoreError } from './live-config';
import { normalizeCustomerPhone, otpProvider, type OtpProvider } from './otp';
const key = (s: string) => cacheKey('customer-otp:' + s);
const phoneHash = (phone: string) => {
  if (!process.env.SESSION_SECRET) throw new StoreError('Sign-in unavailable', 503);
  return createHmac('sha256', process.env.SESSION_SECRET).update(phone).digest('hex');
};
async function limit(name: string, max: number, seconds: number) {
  const n = (await redis().eval(
    "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n",
    1,
    key(name),
    seconds,
  )) as number;
  if (n > max) throw new StoreError('Too many verification attempts. Please try again later.', 429);
}
export async function requestOtp(input: string, ip: string, provider: OtpProvider = otpProvider()) {
  const phone = normalizeCustomerPhone(input),
    hash = phoneHash(phone);
  await limit('global', 200, 60);
  await limit('ip:' + phoneHash(ip), 15, 3600);
  await limit('phone:' + hash, 5, 3600);
  if (!(await redis().set(key('cooldown:' + hash), '1', 'EX', 60, 'NX')))
    throw new StoreError('Please wait 60 seconds before requesting another code.', 429);
  const verificationId = await provider.send(phone),
    challengeId = randomUUID();
  await redis().set(
    key('challenge:' + challengeId),
    JSON.stringify({ phone, verificationId }),
    'EX',
    300,
  );
  return { challengeId, expiresIn: 300, resendAfter: 60 };
}
export async function verifyOtp(
  challengeId: string,
  code: string,
  provider: OtpProvider = otpProvider(),
) {
  if (!/^[a-f0-9-]{36}$/.test(challengeId) || !/^\d{6}$/.test(code))
    throw new StoreError('Enter the six-digit code sent to your phone');
  const lock = key('lock:' + challengeId),
    owner = randomUUID();
  if (!(await redis().set(lock, owner, 'PX', 15000, 'NX')))
    throw new StoreError('Verification is already in progress', 429);
  try {
    const raw = await redis().get(key('challenge:' + challengeId));
    if (!raw) throw new StoreError('This code has expired. Request a new code.', 400);
    const n = await redis().incr(key('attempt:' + challengeId));
    if (n === 1) await redis().expire(key('attempt:' + challengeId), 300);
    if (n > 5) {
      await redis().del(key('challenge:' + challengeId));
      throw new StoreError('Too many incorrect codes. Request a new code.', 429);
    }
    const challenge = JSON.parse(raw) as { phone: string; verificationId: string };
    const approved = await provider.verify(challenge.phone, challenge.verificationId, code);
    if (!approved) {
      if (n === 5) await redis().del(key('challenge:' + challengeId));
      throw new StoreError('Incorrect or expired verification code', 400);
    }
    // Consume before creating a session; replaying an approved challenge cannot log in again.
    const consumed = await redis().del(key('challenge:' + challengeId));
    if (!consumed) throw new StoreError('This code has expired. Request a new code.');
    return challenge.phone;
  } finally {
    await redis().eval(
      "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end;return 0",
      1,
      lock,
      owner,
    );
  }
}
