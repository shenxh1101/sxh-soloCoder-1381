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

export interface Base32ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  invalidPositions: number[];
  invalidChars: string[];
  cleaned: string;
}

export function validateBase32(str: string): Base32ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidPositions: number[] = [];
  const invalidChars: string[] = [];

  if (!str || str.trim().length === 0) {
    return {
      valid: false,
      errors: ['密钥不能为空'],
      warnings: [],
      invalidPositions: [],
      invalidChars: [],
      cleaned: '',
    };
  }

  const cleanedNoSpaces = str.replace(/\s/g, '');
  const upper = cleanedNoSpaces.toUpperCase();

  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (!/^[A-Z2-7=]$/.test(ch)) {
      invalidPositions.push(i);
      if (!invalidChars.includes(ch)) {
        invalidChars.push(ch);
      }
    }
  }

  if (invalidPositions.length > 0) {
    const positions = invalidPositions.slice(0, 5).map((p) => `第${p + 1}位`).join('、');
    const chars = [...new Set(invalidChars)].map((c) => `"${c}"`).join('、');
    errors.push(
      `包含无效字符 ${chars}（位置：${positions}${invalidPositions.length > 5 ? '...' : ''}）`
    );
  }

  const cleanUpper = upper.replace(/[^A-Z2-7=]/g, '');

  if (cleanUpper.length < 4 && cleanUpper.length > 0) {
    errors.push(`密钥过短（${cleanUpper.length} 位），至少需要 4 个 Base32 字符`);
  }

  if (cleanUpper.includes('=')) {
    const paddingIndex = cleanUpper.indexOf('=');
    const afterPadding = cleanUpper.slice(paddingIndex).replace(/=/g, '');
    if (afterPadding.length > 0) {
      errors.push('填充符 "=" 只能出现在末尾');
    }
    if (cleanUpper.length % 8 !== 0) {
      warnings.push('填充位置不标准，部分验证器可能不兼容');
    }
  }

  if (cleanUpper.length % 2 !== 0) {
    warnings.push('密钥长度非偶数，可能影响部分验证器兼容性');
  }

  if (/^\d+$/.test(cleanUpper.slice(0, 2))) {
    warnings.push('开头连续数字可能与部分旧版验证器不兼容');
  }

  return {
    valid: errors.length === 0 && cleanUpper.length >= 4,
    errors,
    warnings,
    invalidPositions,
    invalidChars,
    cleaned: cleanUpper,
  };
}
