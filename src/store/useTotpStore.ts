import { create } from 'zustand';
import type { HashAlgorithm } from '@/utils/totp';
import { generateRandomBase32, isValidBase32 } from '@/utils/base32';
import { parseOtpAuthUri, generateOtpAuthUri, validateOtpAuthUri, type UriValidationResult } from '@/utils/uri';

export interface VerificationHistory {
  id: string;
  input: string;
  timestamp: number;
  valid: boolean;
  offset: number | null;
  window: number;
}

interface TotpState {
  secret: string;
  secretError: string | null;
  digits: number;
  period: number;
  algorithm: HashAlgorithm;
  issuer: string;
  account: string;

  timeOffset: number;
  customTime: number | null;

  verifyWindow: number;
  verificationHistory: VerificationHistory[];

  setSecret: (secret: string) => void;
  setDigits: (digits: number) => void;
  setPeriod: (period: number) => void;
  setAlgorithm: (algorithm: HashAlgorithm) => void;
  setIssuer: (issuer: string) => void;
  setAccount: (account: string) => void;
  generateRandomSecret: (length?: number) => void;

  setTimeOffset: (offset: number) => void;
  setCustomTime: (time: number | null) => void;
  adjustTimeOffset: (delta: number) => void;
  resetTime: () => void;

  setVerifyWindow: (window: number) => void;
  addVerificationHistory: (record: Omit<VerificationHistory, 'id' | 'timestamp'>) => void;
  clearVerificationHistory: () => void;

  importUri: (uri: string) => { success: boolean; error?: string };
  exportUri: () => string;
}

export const useTotpStore = create<TotpState>((set, get) => ({
  secret: generateRandomBase32(16),
  secretError: null,
  digits: 6,
  period: 30,
  algorithm: 'SHA-1',
  issuer: 'DemoApp',
  account: 'user@example.com',

  timeOffset: 0,
  customTime: null,

  verifyWindow: 1,
  verificationHistory: [],

  setSecret: (secret) => {
    const cleaned = secret.toUpperCase().replace(/[^A-Z2-7=]/g, '');
    let error: string | null = null;
    if (cleaned.length > 0 && !isValidBase32(cleaned)) {
      error = '包含无效的 Base32 字符（仅允许 A-Z, 2-7）';
    }
    if (cleaned.length < 4 && cleaned.length > 0) {
      error = '密钥过短，至少需要 4 个 Base32 字符';
    }
    set({ secret: cleaned, secretError: error });
  },
  setDigits: (digits) => set({ digits: Math.max(6, Math.min(8, digits)) }),
  setPeriod: (period) => set({ period: Math.max(1, period) }),
  setAlgorithm: (algorithm) => set({ algorithm }),
  setIssuer: (issuer) => set({ issuer }),
  setAccount: (account) => set({ account }),

  generateRandomSecret: (length = 16) => {
    set({ secret: generateRandomBase32(length), secretError: null });
  },

  setTimeOffset: (offset) => set({ timeOffset: offset }),
  setCustomTime: (time) => set({ customTime: time }),
  adjustTimeOffset: (delta) => set((state) => ({ timeOffset: state.timeOffset + delta })),
  resetTime: () => set({ timeOffset: 0, customTime: null }),

  setVerifyWindow: (window) => set({ verifyWindow: Math.max(0, Math.min(5, window)) }),
  addVerificationHistory: (record) =>
    set((state) => ({
      verificationHistory: [
        {
          ...record,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        },
        ...state.verificationHistory.slice(0, 19),
      ],
    })),
  clearVerificationHistory: () => set({ verificationHistory: [] }),

  importUri: (uri: string): { success: boolean; error?: string } => {
    const validation: UriValidationResult = validateOtpAuthUri(uri);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('；') };
    }

    const params = parseOtpAuthUri(uri);
    if (!params || !params.secret) {
      return { success: false, error: 'URI 解析失败' };
    }

    set({
      secret: params.secret,
      secretError: null,
      digits: params.digits ?? 6,
      period: params.period ?? 30,
      algorithm: params.algorithm ?? 'SHA-1',
      issuer: params.issuer ?? '',
      account: params.account ?? 'user',
    });
    return { success: true };
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

export function getEffectiveNow(): number {
  const { customTime, timeOffset } = useTotpStore.getState();
  if (customTime !== null) {
    return customTime + timeOffset * 1000;
  }
  return Date.now() + timeOffset * 1000;
}
