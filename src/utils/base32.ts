const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: boolean[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const charIndex = BASE32_CHARS.indexOf(cleaned[i]);
    if (charIndex === -1) continue;
    for (let j = 4; j >= 0; j--) {
      bits.push(((charIndex >> j) & 1) === 1);
    }
  }

  const byteCount = Math.floor(bits.length / 8);
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < byteCount; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i * 8 + j] ? 1 : 0);
    }
    bytes[i] = byte;
  }

  return bytes;
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }

  while (bits.length % 5 !== 0) {
    bits += '0';
  }

  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    const index = parseInt(chunk, 2);
    result += BASE32_CHARS[index];
  }

  return result;
}

export function generateRandomBase32(length: number = 16): string {
  const bytes = new Uint8Array(Math.ceil((length * 5) / 8));
  crypto.getRandomValues(bytes);
  const encoded = base32Encode(bytes);
  return encoded.slice(0, length);
}

export function isValidBase32(str: string): boolean {
  const cleaned = str.toUpperCase().replace(/\s/g, '');
  return /^[A-Z2-7]+=*$/.test(cleaned) && cleaned.length > 0;
}
