import { create } from 'zustand';
import type { HashAlgorithm } from '@/utils/totp';
import { generateRandomBase32 } from '@/utils/base32';
import { parseOtpAuthUri, generateOtpAuthUri, validateOtpAuthUri, type UriValidationResult } from '@/utils/uri';
import { generateTOTP } from '@/utils/totp';

export interface VerificationHistory {
  id: string;
  input: string;
  timestamp: number;
  effectiveTimestamp: number;
  valid: boolean;
  offset: number | null;
  window: number;
  standardCode: string;
  codeAtOffset: string | null;
  period: number;
  digits: number;
  algorithm: HashAlgorithm;
  secret: string;
}

export interface BatchTestItem {
  id: string;
  source: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: HashAlgorithm;
  issuer?: string;
  account?: string;
  testTimestamp?: number;
  expectedCode?: string;
  status: 'pending' | 'pass' | 'fail' | 'error';
  actualCode?: string;
  match?: boolean;
  errorMessage?: string;
}

export interface TimeScriptStep {
  id: string;
  label: string;
  action: 'jump' | 'offset' | 'wait';
  value: number;
  unit: 'ms' | 's' | 'm' | 'period';
}

export interface TimePlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentStepIndex: number;
  steps: TimeScriptStep[];
  speed: number;
  loop: boolean;
}

interface TotpState {
  secret: string;
  digits: number;
  period: number;
  algorithm: HashAlgorithm;
  issuer: string;
  account: string;

  timeOffset: number;
  customTime: number | null;

  verifyWindow: number;
  verificationHistory: VerificationHistory[];

  batchTestItems: BatchTestItem[];

  playback: TimePlaybackState;

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
  addVerificationHistory: (record: Omit<VerificationHistory, 'id' | 'timestamp' | 'effectiveTimestamp' | 'standardCode' | 'codeAtOffset'> & {
    offset: number | null;
  }) => Promise<void>;
  clearVerificationHistory: () => void;

  setBatchTestItems: (items: BatchTestItem[]) => void;
  addBatchTestItem: (item: Omit<BatchTestItem, 'id' | 'status'>) => void;
  removeBatchTestItem: (id: string) => void;
  clearBatchTestItems: () => void;
  runBatchTest: () => void;
  importBatchFromUris: (uris: string) => { total: number; success: number; errors: string[] };
  importBatchFromText: (text: string) => { total: number; success: number; errors: string[] };

  setPlaybackSteps: (steps: Omit<TimeScriptStep, 'id'>[]) => void;
  addPlaybackStep: (step: Omit<TimeScriptStep, 'id'>) => void;
  removePlaybackStep: (id: string) => void;
  clearPlaybackSteps: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setPlaybackLoop: (loop: boolean) => void;
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  advancePlayback: () => void;

  importUri: (uri: string) => { success: boolean; error?: string };
  exportUri: () => string;
}

export const useTotpStore = create<TotpState>((set, get) => ({
  secret: generateRandomBase32(16),
  digits: 6,
  period: 30,
  algorithm: 'SHA-1',
  issuer: 'DemoApp',
  account: 'user@example.com',

  timeOffset: 0,
  customTime: null,

  verifyWindow: 1,
  verificationHistory: [],

  batchTestItems: [],

  playback: {
    isPlaying: false,
    isPaused: false,
    currentStepIndex: 0,
    steps: [],
    speed: 1,
    loop: false,
  },

  setSecret: (secret) => {
    set({ secret });
  },
  setDigits: (digits) => set({ digits: Math.max(6, Math.min(8, digits)) }),
  setPeriod: (period) => set({ period: Math.max(1, period) }),
  setAlgorithm: (algorithm) => set({ algorithm }),
  setIssuer: (issuer) => set({ issuer }),
  setAccount: (account) => set({ account }),

  generateRandomSecret: (length = 16) => {
    set({ secret: generateRandomBase32(length) });
  },

  setTimeOffset: (offset) => set({ timeOffset: offset }),
  setCustomTime: (time) => set({ customTime: time }),
  adjustTimeOffset: (delta) => set((state) => ({ timeOffset: state.timeOffset + delta })),
  resetTime: () => set({ timeOffset: 0, customTime: null }),

  setVerifyWindow: (window) => set({ verifyWindow: Math.max(0, Math.min(5, window)) }),
  addVerificationHistory: async (record) => {
    const effectiveNow = getEffectiveNow();
    const standardCode = await generateTOTP(record.secret, {
      digits: record.digits,
      period: record.period,
      algorithm: record.algorithm,
      timestamp: effectiveNow,
    });

    let codeAtOffset: string | null = null;
    if (record.offset !== null && record.offset !== 0) {
      codeAtOffset = await generateTOTP(record.secret, {
        digits: record.digits,
        period: record.period,
        algorithm: record.algorithm,
        timestamp: effectiveNow + record.offset * record.period * 1000,
      });
    }

    set((state) => ({
      verificationHistory: [
        {
          ...record,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
          effectiveTimestamp: effectiveNow,
          standardCode,
          codeAtOffset,
        },
        ...state.verificationHistory.slice(0, 19),
      ],
    }));
  },
  clearVerificationHistory: () => set({ verificationHistory: [] }),

  setBatchTestItems: (items) => set({ batchTestItems: items }),
  addBatchTestItem: (item) =>
    set((state) => ({
      batchTestItems: [
        ...state.batchTestItems,
        { ...item, id: Math.random().toString(36).slice(2), status: 'pending' },
      ],
    })),
  removeBatchTestItem: (id) =>
    set((state) => ({
      batchTestItems: state.batchTestItems.filter((i) => i.id !== id),
    })),
  clearBatchTestItems: () => set({ batchTestItems: [] }),
  runBatchTest: async () => {
    const { batchTestItems } = get();
    const now = Date.now();
    const updated: BatchTestItem[] = [];
    for (const item of batchTestItems) {
      try {
        const ts = item.testTimestamp ?? now;
        const actual = await generateTOTP(item.secret, {
          digits: item.digits,
          period: item.period,
          algorithm: item.algorithm,
          timestamp: ts,
        });
        const match = item.expectedCode ? actual === item.expectedCode : true;
        updated.push({
          ...item,
          actualCode: actual,
          match,
          status: item.expectedCode ? (match ? 'pass' : 'fail') : 'pass',
        });
      } catch (e) {
        updated.push({
          ...item,
          status: 'error',
          errorMessage: e instanceof Error ? e.message : '计算失败',
        });
      }
    }
    set({ batchTestItems: updated });
  },
  importBatchFromUris: (uriText) => {
    const uris = uriText
      .split(/[\n,;]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    const errors: string[] = [];
    const items: BatchTestItem[] = [];

    uris.forEach((uri, idx) => {
      const validation = validateOtpAuthUri(uri);
      if (!validation.valid) {
        errors.push(`第 ${idx + 1} 条：${validation.errors[0]}`);
        return;
      }
      const params = parseOtpAuthUri(uri);
      if (!params) {
        errors.push(`第 ${idx + 1} 条：解析失败`);
        return;
      }
      items.push({
        id: Math.random().toString(36).slice(2),
        source: uri,
        secret: params.secret,
        digits: params.digits ?? 6,
        period: params.period ?? 30,
        algorithm: params.algorithm ?? 'SHA-1',
        issuer: params.issuer,
        account: params.account,
        status: 'pending',
      });
    });

    set({ batchTestItems: items });
    return { total: uris.length, success: items.length, errors };
  },
  importBatchFromText: (text) => {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const errors: string[] = [];
    const items: BatchTestItem[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/[\t,，\s]+/);
      if (parts.length < 2) {
        errors.push(`第 ${idx + 1} 行：格式不正确，至少需要 密钥,验证码`);
        return;
      }

      let secret = parts[0].trim();
      let expectedCode: string | undefined;
      let testTimestamp: number | undefined;
      let digits = 6;
      let period = 30;
      let algorithm: HashAlgorithm = 'SHA-1';

      for (const part of parts.slice(1)) {
        const p = part.trim();
        if (/^\d{6,8}$/.test(p)) {
          expectedCode = p;
          digits = p.length;
        } else if (/^\d{10,13}$/.test(p)) {
          const n = parseInt(p, 10);
          testTimestamp = n > 9999999999 ? n : n * 1000;
        } else if (/^sha-?(1|256|512)$/i.test(p)) {
          const upper = p.toUpperCase().replace('-', '');
          if (upper === 'SHA1') algorithm = 'SHA-1';
          else if (upper === 'SHA256') algorithm = 'SHA-256';
          else if (upper === 'SHA512') algorithm = 'SHA-512';
        } else if (/^\d{1,3}s$/i.test(p)) {
          period = parseInt(p, 10);
        }
      }

      if (!expectedCode) {
        errors.push(`第 ${idx + 1} 行：缺少 6-8 位验证码`);
        return;
      }

      items.push({
        id: Math.random().toString(36).slice(2),
        source: line,
        secret,
        digits,
        period,
        algorithm,
        testTimestamp,
        expectedCode,
        status: 'pending',
      });
    });

    set({ batchTestItems: items });
    return { total: lines.length, success: items.length, errors };
  },

  setPlaybackSteps: (steps) =>
    set((state) => ({
      playback: {
        ...state.playback,
        steps: steps.map((s) => ({ ...s, id: Math.random().toString(36).slice(2) })),
        currentStepIndex: 0,
      },
    })),
  addPlaybackStep: (step) =>
    set((state) => ({
      playback: {
        ...state.playback,
        steps: [...state.playback.steps, { ...step, id: Math.random().toString(36).slice(2) }],
      },
    })),
  removePlaybackStep: (id) =>
    set((state) => ({
      playback: {
        ...state.playback,
        steps: state.playback.steps.filter((s) => s.id !== id),
      },
    })),
  clearPlaybackSteps: () =>
    set((state) => ({
      playback: { ...state.playback, steps: [], currentStepIndex: 0 },
    })),
  setPlaybackSpeed: (speed) =>
    set((state) => ({ playback: { ...state.playback, speed } })),
  setPlaybackLoop: (loop) =>
    set((state) => ({ playback: { ...state.playback, loop } })),
  startPlayback: () =>
    set((state) => ({
      playback: { ...state.playback, isPlaying: true, isPaused: false, currentStepIndex: 0 },
    })),
  pausePlayback: () =>
    set((state) => ({ playback: { ...state.playback, isPaused: true } })),
  stopPlayback: () =>
    set((state) => ({
      playback: { ...state.playback, isPlaying: false, isPaused: false, currentStepIndex: 0 },
    })),
  advancePlayback: () => {
    const state = get();
    const { steps, currentStepIndex, isPlaying, isPaused, loop, speed } = state.playback;

    if (!isPlaying || isPaused || steps.length === 0) return;

    const step = steps[currentStepIndex];
    if (!step) {
      if (loop) {
        set((s) => ({ playback: { ...s.playback, currentStepIndex: 0 } }));
      } else {
        set((s) => ({ playback: { ...s.playback, isPlaying: false } }));
      }
      return;
    }

    switch (step.action) {
      case 'jump': {
        let ms = step.value;
        if (step.unit === 's') ms *= 1000;
        else if (step.unit === 'm') ms *= 60000;
        else if (step.unit === 'period') ms *= state.period * 1000;
        set({ customTime: Date.now() + ms });
        break;
      }
      case 'offset': {
        let ms = step.value;
        if (step.unit === 's') ms *= 1000;
        else if (step.unit === 'm') ms *= 60000;
        else if (step.unit === 'period') ms *= state.period * 1000;
        set((s) => ({ timeOffset: s.timeOffset + ms / 1000 }));
        break;
      }
      case 'wait':
        break;
    }

    const nextIdx = currentStepIndex + 1;
    if (nextIdx >= steps.length) {
      if (loop) {
        set((s) => ({ playback: { ...s.playback, currentStepIndex: 0 } }));
      } else {
        set((s) => ({ playback: { ...s.playback, isPlaying: false, currentStepIndex: nextIdx } }));
      }
    } else {
      set((s) => ({ playback: { ...s.playback, currentStepIndex: nextIdx } }));
    }

    void speed;
  },

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
