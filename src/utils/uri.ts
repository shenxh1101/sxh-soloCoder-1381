import type { HashAlgorithm } from './totp';

export interface OtpAuthParams {
  secret: string;
  issuer?: string;
  account?: string;
  digits?: number;
  period?: number;
  algorithm?: HashAlgorithm;
}

export function generateOtpAuthUri(params: OtpAuthParams): string {
  const { secret, issuer = '', account = 'user@example.com', digits = 6, period = 30, algorithm = 'SHA-1' } = params;

  const label = issuer ? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}` : encodeURIComponent(account);

  const queryParams = new URLSearchParams();
  queryParams.set('secret', secret.toUpperCase().replace(/\s/g, ''));
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

    const secret = params.get('secret') || '';
    const issuerParam = params.get('issuer');
    if (issuerParam && !issuer) {
      issuer = issuerParam;
    }

    const digits = params.get('digits') ? parseInt(params.get('digits')!, 10) : 6;
    const period = params.get('period') ? parseInt(params.get('period')!, 10) : 30;
    const algorithmParam = params.get('algorithm')?.toUpperCase();
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
