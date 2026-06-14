import { base32Decode } from './base32';

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

export interface TotpOptions {
  digits?: number;
  period?: number;
  algorithm?: HashAlgorithm;
  timestamp?: number;
}

function intToBytes(value: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(value), false);
  return new Uint8Array(buffer);
}

async function hmacSha(key: Uint8Array, message: Uint8Array, algorithm: HashAlgorithm): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

function dynamicTruncate(hmacResult: Uint8Array): number {
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
  return binary >>> 0;
}

export async function generateTOTP(
  secret: string,
  options: TotpOptions = {}
): Promise<string> {
  const {
    digits = 6,
    period = 30,
    algorithm = 'SHA-1',
    timestamp = Date.now(),
  } = options;

  if (!secret) {
    return ''.padStart(digits, '0');
  }

  try {
    const counter = Math.floor(timestamp / 1000 / period);
    const keyBytes = base32Decode(secret);

    if (keyBytes.length === 0) {
      return ''.padStart(digits, '0');
    }

    const counterBytes = intToBytes(counter);
    const hmacResult = await hmacSha(keyBytes, counterBytes, algorithm);
    const binaryCode = dynamicTruncate(hmacResult);
    const token = binaryCode % Math.pow(10, digits);

    return token.toString().padStart(digits, '0');
  } catch {
    return ''.padStart(digits, '0');
  }
}

export async function verifyTOTP(
  token: string,
  secret: string,
  options: TotpOptions & { window?: number; nowTimestamp?: number } = {}
): Promise<{ valid: boolean; offset: number | null }> {
  const { window = 0, period = 30, nowTimestamp, ...rest } = options;
  const currentTime = nowTimestamp ?? Date.now();

  for (let offset = -window; offset <= window; offset++) {
    const timestamp = currentTime + offset * period * 1000;
    const generated = await generateTOTP(secret, { ...rest, period, timestamp });
    if (generated === token) {
      return { valid: true, offset };
    }
  }

  return { valid: false, offset: null };
}

export function getRemainingSeconds(period: number = 30, now?: number): number {
  const t = (now ?? Date.now()) / 1000;
  return period - (t % period);
}

export function getProgress(period: number = 30, now?: number): number {
  const t = (now ?? Date.now()) / 1000;
  return ((t % period) / period) * 100;
}

export function getTimeWindow(period: number = 30, now?: number): number {
  return Math.floor((now ?? Date.now()) / 1000 / period);
}
