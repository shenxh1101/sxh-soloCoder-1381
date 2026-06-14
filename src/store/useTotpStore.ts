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
  hitWindowTimestamp: number | null;
}

export interface BatchTestSnapshot {
  id: string;
  createdAt: number;
  items: BatchTestItem[];
  passCount: number;
  failCount: number;
  errorCount: number;
}

export interface BatchTestSuite {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: Omit<BatchTestItem, 'status' | 'actualCode' | 'match' | 'errorMessage'>[];
  snapshots: BatchTestSnapshot[];
}

export interface DualClockConfig {
  enabled: boolean;
  deviceA: {
    label: string;
    timeOffset: number;
    period: number;
    algorithm: HashAlgorithm;
    digits: number;
    secret: string;
  };
  deviceB: {
    label: string;
    timeOffset: number;
    period: number;
    algorithm: HashAlgorithm;
    digits: number;
    secret: string;
  };
}

export interface PlaybackTraceStep {
  id: string;
  stepIndex: number;
  label: string;
  action: 'jump' | 'offset' | 'wait';
  value: number;
  unit: 'ms' | 's' | 'm' | 'period';
  executedAt: number;
  effectiveTimeBefore: number;
  effectiveTimeAfter: number;
  durationMs: number;
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
  trace: PlaybackTraceStep[];
}

const BATCH_SUITES_KEY = 'totp.batchSuites.v1';

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
  batchSuites: BatchTestSuite[];

  playback: TimePlaybackState;

  dualClock: DualClockConfig;

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
  addVerificationHistory: (record: Omit<VerificationHistory, 'id' | 'timestamp' | 'effectiveTimestamp' | 'standardCode' | 'codeAtOffset' | 'hitWindowTimestamp'> & {
    offset: number | null;
  }) => Promise<void>;
  clearVerificationHistory: () => void;

  setBatchTestItems: (items: BatchTestItem[]) => void;
  addBatchTestItem: (item: Omit<BatchTestItem, 'id' | 'status'>) => void;
  removeBatchTestItem: (id: string) => void;
  clearBatchTestItems: () => void;
  runBatchTest: () => Promise<void>;
  importBatchFromUris: (uris: string) => { total: number; success: number; errors: string[] };
  importBatchFromText: (text: string) => { total: number; success: number; errors: string[] };

  saveBatchSuite: (name: string, withSnapshot?: boolean) => BatchTestSuite;
  loadBatchSuite: (id: string) => void;
  deleteBatchSuite: (id: string) => void;
  updateBatchSuite: (id: string, patch: Partial<BatchTestSuite>) => void;

  setPlaybackSteps: (steps: Omit<TimeScriptStep, 'id'>[]) => void;
  addPlaybackStep: (step: Omit<TimeScriptStep, 'id'>) => void;
  removePlaybackStep: (id: string) => void;
  clearPlaybackSteps: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setPlaybackLoop: (loop: boolean) => void;
  startPlayback: (resume?: boolean) => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  advancePlayback: () => { completed: boolean; waitMs?: number } | null;
  clearPlaybackTrace: () => void;

  setDualClockEnabled: (enabled: boolean) => void;
  setDualClockDevice: (device: 'A' | 'B', patch: Partial<DualClockConfig['deviceA']>) => void;
  syncDualClockFromMain: (device: 'A' | 'B' | 'both') => void;

  importUri: (uri: string) => { success: boolean; error?: string };
  exportUri: () => string;
}

function loadSuitesFromStorage(): BatchTestSuite[] {
  try {
    const raw = localStorage.getItem(BATCH_SUITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSuitesToStorage(suites: BatchTestSuite[]) {
  try {
    localStorage.setItem(BATCH_SUITES_KEY, JSON.stringify(suites));
  } catch {
    /* storage full or unavailable */
  }
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
  batchSuites: loadSuitesFromStorage(),

  playback: {
    isPlaying: false,
    isPaused: false,
    currentStepIndex: 0,
    steps: [],
    speed: 1,
    loop: false,
    trace: [],
  },

  dualClock: {
    enabled: false,
    deviceA: {
      label: '设备 A（服务器）',
      timeOffset: 0,
      period: 30,
      algorithm: 'SHA-1',
      digits: 6,
      secret: generateRandomBase32(16),
    },
    deviceB: {
      label: '设备 B（客户端，快 45 秒）',
      timeOffset: 45,
      period: 30,
      algorithm: 'SHA-1',
      digits: 6,
      secret: generateRandomBase32(16),
    },
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
    let hitWindowTimestamp: number | null = null;
    if (record.offset !== null && record.offset !== 0) {
      hitWindowTimestamp = effectiveNow + record.offset * record.period * 1000;
      codeAtOffset = await generateTOTP(record.secret, {
        digits: record.digits,
        period: record.period,
        algorithm: record.algorithm,
        timestamp: hitWindowTimestamp,
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
          hitWindowTimestamp,
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
  saveBatchSuite: (name, withSnapshot = true) => {
    const state = get();
    const { batchTestItems } = state;
    const now = Date.now();
    const cleanItems = batchTestItems.map(({ status: _s, actualCode: _a, match: _m, errorMessage: _e, ...rest }) => rest);

    let snapshot: BatchTestSnapshot | undefined;
    if (withSnapshot && batchTestItems.length > 0 && batchTestItems.every((i) => i.status !== 'pending')) {
      snapshot = {
        id: Math.random().toString(36).slice(2),
        createdAt: now,
        items: batchTestItems,
        passCount: batchTestItems.filter((i) => i.status === 'pass').length,
        failCount: batchTestItems.filter((i) => i.status === 'fail').length,
        errorCount: batchTestItems.filter((i) => i.status === 'error').length,
      };
    }

    const suite: BatchTestSuite = {
      id: Math.random().toString(36).slice(2),
      name: name || `未命名方案 ${new Date(now).toLocaleString()}`,
      createdAt: now,
      updatedAt: now,
      items: cleanItems,
      snapshots: snapshot ? [snapshot] : [],
    };

    const next = [...state.batchSuites, suite];
    saveSuitesToStorage(next);
    set({ batchSuites: next });
    return suite;
  },
  loadBatchSuite: (id) => {
    const suite = get().batchSuites.find((s) => s.id === id);
    if (!suite) return;
    const items: BatchTestItem[] = suite.items.map((it) => ({
      ...it,
      status: 'pending' as const,
    }));
    set({ batchTestItems: items });
  },
  deleteBatchSuite: (id) => {
    const next = get().batchSuites.filter((s) => s.id !== id);
    saveSuitesToStorage(next);
    set({ batchSuites: next });
  },
  updateBatchSuite: (id, patch) => {
    const next = get().batchSuites.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s));
    saveSuitesToStorage(next);
    set({ batchSuites: next });
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
  startPlayback: (resume = false) =>
    set((state) => {
      const nextIdx = resume ? state.playback.currentStepIndex : 0;
      const trace = resume ? state.playback.trace : [];
      return {
        playback: {
          ...state.playback,
          isPlaying: true,
          isPaused: false,
          currentStepIndex: nextIdx,
          trace,
        },
      };
    }),
  pausePlayback: () =>
    set((state) => ({ playback: { ...state.playback, isPaused: true } })),
  stopPlayback: () =>
    set((state) => ({
      playback: { ...state.playback, isPlaying: false, isPaused: false, currentStepIndex: 0 },
    })),
  clearPlaybackTrace: () =>
    set((state) => ({ playback: { ...state.playback, trace: [] } })),
  advancePlayback: () => {
    const state = get();
    const { steps, currentStepIndex, isPlaying, isPaused, loop, speed } = state.playback;

    if (!isPlaying || isPaused || steps.length === 0) return null;

    const step = steps[currentStepIndex];
    if (!step) {
      if (loop) {
        set((s) => ({ playback: { ...s.playback, currentStepIndex: 0 } }));
        return { completed: false };
      } else {
        set((s) => ({ playback: { ...s.playback, isPlaying: false } }));
        return { completed: true };
      }
    }

    let waitMs: number | undefined;
    const executedAt = Date.now();
    const timeBefore = getEffectiveNow();
    let timeAfter = timeBefore;

    switch (step.action) {
      case 'jump': {
        let ms = step.value;
        if (step.unit === 's') ms *= 1000;
        else if (step.unit === 'm') ms *= 60000;
        else if (step.unit === 'period') ms *= state.period * 1000;
        set({ customTime: Date.now() + ms });
        timeAfter = Date.now() + ms + get().timeOffset * 1000;
        break;
      }
      case 'offset': {
        let ms = step.value;
        if (step.unit === 's') ms *= 1000;
        else if (step.unit === 'm') ms *= 60000;
        else if (step.unit === 'period') ms *= state.period * 1000;
        set((s) => ({ timeOffset: s.timeOffset + ms / 1000 }));
        timeAfter = timeBefore + ms;
        break;
      }
      case 'wait': {
        let ms = step.value;
        if (step.unit === 's') ms *= 1000;
        else if (step.unit === 'm') ms *= 60000;
        else if (step.unit === 'period') ms *= state.period * 1000;
        waitMs = Math.max(1, ms / Math.max(0.01, speed));
        break;
      }
    }

    const traceStep: PlaybackTraceStep = {
      id: Math.random().toString(36).slice(2),
      stepIndex: currentStepIndex,
      label: step.label,
      action: step.action,
      value: step.value,
      unit: step.unit,
      executedAt,
      effectiveTimeBefore: timeBefore,
      effectiveTimeAfter: timeAfter,
      durationMs: waitMs ?? 0,
    };

    const nextIdx = currentStepIndex + 1;
    let finished = false;
    if (nextIdx >= steps.length) {
      if (loop) {
        set((s) => ({
          playback: {
            ...s.playback,
            currentStepIndex: 0,
            trace: [...s.playback.trace, traceStep],
          },
        }));
      } else {
        set((s) => ({
          playback: {
            ...s.playback,
            isPlaying: false,
            currentStepIndex: nextIdx,
            trace: [...s.playback.trace, traceStep],
          },
        }));
        finished = true;
      }
    } else {
      set((s) => ({
        playback: {
          ...s.playback,
          currentStepIndex: nextIdx,
          trace: [...s.playback.trace, traceStep],
        },
      }));
    }

    return { completed: finished, waitMs };
  },

  setDualClockEnabled: (enabled) =>
    set((state) => ({ dualClock: { ...state.dualClock, enabled } })),
  setDualClockDevice: (device, patch) =>
    set((state) => {
      const key = device === 'A' ? 'deviceA' : 'deviceB';
      return {
        dualClock: {
          ...state.dualClock,
          [key]: { ...state.dualClock[key], ...patch },
        },
      };
    }),
  syncDualClockFromMain: (device) => {
    const { secret, period, algorithm, digits } = get();
    set((state) => {
      const next = { ...state.dualClock };
      const patch = { secret, period, algorithm, digits };
      if (device === 'A' || device === 'both') {
        next.deviceA = { ...next.deviceA, ...patch };
      }
      if (device === 'B' || device === 'both') {
        next.deviceB = { ...next.deviceB, ...patch };
      }
      return { dualClock: next };
    });
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
