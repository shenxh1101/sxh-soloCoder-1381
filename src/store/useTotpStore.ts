import { create } from 'zustand';
import type { HashAlgorithm } from '@/utils/totp';
import { generateRandomBase32 } from '@/utils/base32';
import { parseOtpAuthUri, generateOtpAuthUri } from '@/utils/uri';

interface TotpState {
  secret: string;
  digits: number;
  period: number;
  algorithm: HashAlgorithm;
  issuer: string;
  account: string;
  setSecret: (secret: string) => void;
  setDigits: (digits: number) => void;
  setPeriod: (period: number) => void;
  setAlgorithm: (algorithm: HashAlgorithm) => void;
  setIssuer: (issuer: string) => void;
  setAccount: (account: string) => void;
  generateRandomSecret: (length?: number) => void;
  importUri: (uri: string) => boolean;
  exportUri: () => string;
}

export const useTotpStore = create<TotpState>((set, get) => ({
  secret: generateRandomBase32(16),
  digits: 6,
  period: 30,
  algorithm: 'SHA-1',
  issuer: 'DemoApp',
  account: 'user@example.com',

  setSecret: (secret) => set({ secret }),
  setDigits: (digits) => set({ digits }),
  setPeriod: (period) => set({ period }),
  setAlgorithm: (algorithm) => set({ algorithm }),
  setIssuer: (issuer) => set({ issuer }),
  setAccount: (account) => set({ account }),

  generateRandomSecret: (length = 16) => {
    set({ secret: generateRandomBase32(length) });
  },

  importUri: (uri: string) => {
    const params = parseOtpAuthUri(uri);
    if (params && params.secret) {
      set({
        secret: params.secret,
        digits: params.digits ?? 6,
        period: params.period ?? 30,
        algorithm: params.algorithm ?? 'SHA-1',
        issuer: params.issuer ?? '',
        account: params.account ?? 'user',
      });
      return true;
    }
    return false;
  },

  exportUri: () => {
    const { secret, digits, period, algorithm, issuer, account } = get();
    return generateOtpAuthUri({
      secret,
      digits,
      period,
      algorithm,
      issuer,
      account,
    });
  },
}));
