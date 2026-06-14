import type { HashAlgorithm } from './totp';
import { isValidBase32 } from './base32';

export interface OtpAuthParams {
  secret: string;
  issuer?: string;
  account?: string;
  digits?: number;
  period?: number;
  algorithm?: HashAlgorithm;
}

export interface UriValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_ALGORITHMS = ['SHA1', 'SHA256', 'SHA512', 'SHA-1', 'SHA-256', 'SHA-512'];
const VALID_DIGITS = [6, 7, 8];
const MIN_PERIOD = 1;
const MAX_PERIOD = 3600;

export function validateOtpAuthUri(uri: string): UriValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!uri) {
    return { valid: false, errors: ['URI 不能为空'], warnings: [] };
  }

  if (!uri.startsWith('otpauth://')) {
    errors.push('URI 必须以 otpauth:// 开头');
    return { valid: false, errors, warnings };
  }

  if (!uri.startsWith('otpauth://totp/')) {
    errors.push('本工具仅支持 totp 类型（otpauth://totp/）');
    return { valid: false, errors, warnings };
  }

  try {
    const withoutScheme = uri.slice('otpauth://totp/'.length);
    const queryIndex = withoutScheme.indexOf('?');

    const labelPart = queryIndex === -1
      ? decodeURIComponent(withoutScheme)
      : decodeURIComponent(withoutScheme.slice(0, queryIndex));

    if (!labelPart) {
      warnings.push('缺少 label（账户标识）');
    }

    const queryString = queryIndex === -1 ? '' : withoutScheme.slice(queryIndex + 1);
    const params = new URLSearchParams(queryString);

    const secret = params.get('secret');
    if (!secret) {
      errors.push('缺少必需参数 secret');
    } else {
      const cleanSecret = secret.toUpperCase().replace(/\s/g, '');
      if (!isValidBase32(cleanSecret)) {
        errors.push(`secret 参数包含无效 Base32 字符："${secret}"`);
      }
      if (cleanSecret.length < 4) {
        errors.push('secret 过短，至少需要 4 个 Base32 字符');
      }
    }

    const digits = params.get('digits');
    if (digits) {
      const d = parseInt(digits, 10);
      if (isNaN(d) || !VALID_DIGITS.includes(d)) {
        errors.push(`digits 参数无效："${digits}"，允许值：6, 7, 8`);
      }
    }

    const period = params.get('period');
    if (period) {
      const p = parseInt(period, 10);
      if (isNaN(p) || p < MIN_PERIOD || p > MAX_PERIOD) {
        errors.push(`period 参数无效："${period}"，允许范围：${MIN_PERIOD}-${MAX_PERIOD} 秒`);
      }
    }

    const algorithm = params.get('algorithm');
    if (algorithm) {
      if (!VALID_ALGORITHMS.includes(algorithm.toUpperCase())) {
        errors.push(`algorithm 参数无效："${algorithm}"，允许值：SHA1, SHA256, SHA512`);
      }
    }

    const issuerParam = params.get('issuer');
    const colonIndex = labelPart.indexOf(':');
    if (colonIndex !== -1 && issuerParam) {
      const labelIssuer = labelPart.slice(0, colonIndex);
      if (labelIssuer !== issuerParam) {
        warnings.push(`label 中的 issuer ("${labelIssuer}") 与 query 参数 issuer ("${issuerParam}") 不一致`);
      }
    }
  } catch (e) {
    errors.push('URI 格式解析失败');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function generateOtpAuthUri(params: OtpAuthParams): string {
  const { secret, issuer = '', account = 'user@example.com', digits = 6, period = 30, algorithm = 'SHA-1' } = params;

  const cleanSecret = secret.toUpperCase().replace(/\s/g, '');

  const label = issuer
    ? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
    : encodeURIComponent(account);

  const queryParams = new URLSearchParams();
  queryParams.set('secret', cleanSecret);
  if (issuer) queryParams.set('issuer', issuer);
  if (digits !== 6) queryParams.set('digits', digits.toString());
  if (period !== 30) queryParams.set('period', period.toString());
  if (algorithm !== 'SHA-1') queryParams.set('algorithm', algorithm.replace('-', ''));

  return `otpauth://totp/${label}?${queryParams.toString()}`;
}

export function parseOtpAuthUri(uri: string): OtpAuthParams | null {
  try {
    if (!uri.startsWith('otpauth://totp/')) {
      return null;
    }

    const withoutScheme = uri.slice('otpauth://totp/'.length);
    const queryIndex = withoutScheme.indexOf('?');

    let label = '';
    let queryString = '';

    if (queryIndex === -1) {
      label = decodeURIComponent(withoutScheme);
    } else {
      label = decodeURIComponent(withoutScheme.slice(0, queryIndex));
      queryString = withoutScheme.slice(queryIndex + 1);
    }

    const params = new URLSearchParams(queryString);

    let issuer = '';
    let account = '';

    const colonIndex = label.indexOf(':');
    if (colonIndex !== -1) {
      issuer = label.slice(0, colonIndex);
      account = label.slice(colonIndex + 1);
    } else {
      account = label;
    }

    const secret = (params.get('secret') || '').toUpperCase().replace(/\s/g, '');
    const issuerParam = params.get('issuer');
    if (issuerParam && !issuer) {
      issuer = issuerParam;
    }

    const digitsStr = params.get('digits');
    const digits = digitsStr ? parseInt(digitsStr, 10) : 6;
    const periodStr = params.get('period');
    const period = periodStr ? parseInt(periodStr, 10) : 30;

    const algorithmParam = (params.get('algorithm') || '').toUpperCase().replace('-', '');
    let algorithm: HashAlgorithm = 'SHA-1';
    if (algorithmParam === 'SHA256') algorithm = 'SHA-256';
    else if (algorithmParam === 'SHA512') algorithm = 'SHA-512';

    return {
      secret,
      issuer,
      account,
      digits,
      period,
      algorithm,
    };
  } catch {
    return null;
  }
}
