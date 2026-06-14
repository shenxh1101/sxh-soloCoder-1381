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
  paramErrors: {
    secret?: string;
    digits?: string;
    period?: string;
    algorithm?: string;
    issuer?: string;
    label?: string;
  };
}

const VALID_ALGORITHMS = ['SHA1', 'SHA256', 'SHA512', 'SHA-1', 'SHA-256', 'SHA-512'];
const VALID_DIGITS = [6, 7, 8];
const MIN_PERIOD = 1;
const MAX_PERIOD = 3600;
const RECOMMENDED_PERIOD_MIN = 15;
const RECOMMENDED_PERIOD_MAX = 120;

export function validateOtpAuthUri(uri: string): UriValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const paramErrors: UriValidationResult['paramErrors'] = {};

  if (!uri) {
    return { valid: false, errors: ['URI 不能为空'], warnings: [], paramErrors };
  }

  if (!uri.startsWith('otpauth://')) {
    errors.push('URI 必须以 otpauth:// 开头');
    return { valid: false, errors, warnings, paramErrors };
  }

  if (!uri.startsWith('otpauth://totp/')) {
    const typeMatch = uri.match(/^otpauth:\/\/(\w+)\//);
    const type = typeMatch ? typeMatch[1] : 'unknown';
    errors.push(`仅支持 TOTP 类型，当前是 "${type}"，请使用 otpauth://totp/ 开头`);
    return { valid: false, errors, warnings, paramErrors };
  }

  try {
    const withoutScheme = uri.slice('otpauth://totp/'.length);
    const queryIndex = withoutScheme.indexOf('?');

    const labelPart = queryIndex === -1
      ? decodeURIComponent(withoutScheme)
      : decodeURIComponent(withoutScheme.slice(0, queryIndex));

    if (!labelPart) {
      warnings.push('缺少 label（账户标识），建议格式：发行方:账户名');
      paramErrors.label = '缺少账户标识';
    } else if (!labelPart.includes(':')) {
      warnings.push('label 未包含发行方，推荐格式：发行方:账户名');
    }

    const queryString = queryIndex === -1 ? '' : withoutScheme.slice(queryIndex + 1);
    const params = new URLSearchParams(queryString);

    // 检查未知参数
    const knownParams = ['secret', 'issuer', 'digits', 'period', 'algorithm', 'image'];
    for (const [key] of params) {
      if (!knownParams.includes(key)) {
        warnings.push(`存在未知参数 "${key}"，可能不会被识别`);
      }
    }

    // secret 参数
    const secret = params.get('secret');
    if (!secret) {
      paramErrors.secret = '缺少必需参数 secret';
      errors.push(paramErrors.secret);
    } else if (!secret.trim()) {
      paramErrors.secret = 'secret 为空字符串';
      errors.push(paramErrors.secret);
    } else {
      const cleanSecret = secret.toUpperCase().replace(/\s/g, '');
      if (cleanSecret.length < 4) {
        paramErrors.secret = `secret 过短（${cleanSecret.length} 位），至少需要 4 个 Base32 字符`;
        errors.push(paramErrors.secret);
      } else {
        const invalidChars: string[] = [];
        for (const ch of cleanSecret) {
          if (!/^[A-Z2-7=]$/.test(ch) && !invalidChars.includes(ch)) {
            invalidChars.push(ch);
          }
        }
        if (invalidChars.length > 0) {
          paramErrors.secret = `secret 包含无效字符：${invalidChars.map((c) => `"${c}"`).join('、')}（仅允许 A-Z, 2-7）`;
          errors.push(paramErrors.secret);
        } else if (cleanSecret.length % 8 !== 0 && cleanSecret.includes('=')) {
          warnings.push('secret 填充符位置不标准，部分客户端可能不兼容');
        }
      }
    }

    // digits 参数
    const digits = params.get('digits');
    if (digits !== null) {
      if (digits === '') {
        paramErrors.digits = 'digits 为空值';
        errors.push(paramErrors.digits);
      } else {
        const d = parseInt(digits, 10);
        if (isNaN(d)) {
          paramErrors.digits = `digits 不是有效数字："${digits}"`;
          errors.push(paramErrors.digits);
        } else if (!VALID_DIGITS.includes(d)) {
          paramErrors.digits = `digits 不支持 ${d} 位，仅允许：${VALID_DIGITS.join(', ')}`;
          errors.push(paramErrors.digits);
        } else if (d !== 6) {
          warnings.push(`digits=${d} 为非默认值，部分客户端可能不支持`);
        }
      }
    }

    // period 参数
    const period = params.get('period');
    if (period !== null) {
      if (period === '') {
        paramErrors.period = 'period 为空值';
        errors.push(paramErrors.period);
      } else {
        const p = parseInt(period, 10);
        if (isNaN(p)) {
          paramErrors.period = `period 不是有效数字："${period}"`;
          errors.push(paramErrors.period);
        } else if (p < MIN_PERIOD || p > MAX_PERIOD) {
          paramErrors.period = `period=${p} 超出允许范围（${MIN_PERIOD}-${MAX_PERIOD} 秒）`;
          errors.push(paramErrors.period);
        } else if (p < RECOMMENDED_PERIOD_MIN) {
          warnings.push(`period=${p} 秒过短，低于推荐最小值 ${RECOMMENDED_PERIOD_MIN} 秒，可能影响安全性`);
        } else if (p > RECOMMENDED_PERIOD_MAX) {
          warnings.push(`period=${p} 秒过长，高于推荐最大值 ${RECOMMENDED_PERIOD_MAX} 秒，降低动态密码时效性`);
        } else if (p !== 30) {
          warnings.push(`period=${p} 为非默认值，部分客户端可能不支持`);
        }
      }
    }

    // algorithm 参数
    const algorithm = params.get('algorithm');
    if (algorithm !== null) {
      if (algorithm === '') {
        paramErrors.algorithm = 'algorithm 为空值';
        errors.push(paramErrors.algorithm);
      } else if (!VALID_ALGORITHMS.includes(algorithm.toUpperCase())) {
        paramErrors.algorithm = `algorithm 不支持 "${algorithm}"，仅允许：SHA1, SHA256, SHA512`;
        errors.push(paramErrors.algorithm);
      } else if (!['SHA1', 'SHA-1'].includes(algorithm.toUpperCase())) {
        warnings.push(`algorithm=${algorithm} 为非默认值，Google Authenticator 可能不支持`);
      }
    }

    // issuer 参数一致性检查
    const issuerParam = params.get('issuer');
    const colonIndex = labelPart.indexOf(':');
    if (colonIndex !== -1 && issuerParam) {
      const labelIssuer = labelPart.slice(0, colonIndex);
      if (labelIssuer !== issuerParam) {
        warnings.push(`label 中的发行方 ("${labelIssuer}") 与 issuer 参数 ("${issuerParam}") 不一致，建议保持一致`);
      }
    } else if (issuerParam && !labelPart.includes(':')) {
      warnings.push('已设置 issuer 参数，但 label 中未包含发行方，建议 label 格式为 "发行方:账户名"');
    } else if (!issuerParam && colonIndex === -1) {
      warnings.push('未设置 issuer，建议在 label 或参数中指定发行方');
    }
  } catch (e) {
    errors.push('URI 格式解析失败，可能存在非法字符或编码错误');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    paramErrors,
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
