import { useState, useEffect, useCallback, useRef } from 'react';
import { generateTOTP, getRemainingSeconds, getProgress, getTimeWindow } from '@/utils/totp';
import type { HashAlgorithm } from '@/utils/totp';
import { getEffectiveNow } from '@/store/useTotpStore';

interface UseTotpResult {
  token: string;
  remainingSeconds: number;
  progress: number;
  timeWindow: number;
  isLoading: boolean;
  effectiveNow: number;
}

export function useTotp(
  secret: string,
  digits: number = 6,
  period: number = 30,
  algorithm: HashAlgorithm = 'SHA-1',
  autoTick: boolean = true
): UseTotpResult {
  const [token, setToken] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [timeWindow, setTimeWindow] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [effectiveNow, setEffectiveNow] = useState<number>(0);
  const lastWindowRef = useRef<number>(-1);

  const updateToken = useCallback(async (now: number) => {
    if (!secret) {
      setToken('');
      setIsLoading(false);
      return;
    }

    try {
      const window = getTimeWindow(period, now);
      if (window !== lastWindowRef.current) {
        lastWindowRef.current = window;
        const newToken = await generateTOTP(secret, { digits, period, algorithm, timestamp: now });
        setToken(newToken);
      }
      setIsLoading(false);
    } catch {
      setToken('');
      setIsLoading(false);
    }
  }, [secret, digits, period, algorithm]);

  useEffect(() => {
    lastWindowRef.current = -1;
    setIsLoading(true);
    const now = getEffectiveNow();
    setEffectiveNow(now);
    updateToken(now);
  }, [secret, digits, period, algorithm, updateToken]);

  useEffect(() => {
    if (!autoTick) return;

    const now = getEffectiveNow();
    const window = getTimeWindow(period, now);
    const remaining = getRemainingSeconds(period, now);
    const prog = getProgress(period, now);
    setTimeWindow(window);
    setRemainingSeconds(Math.ceil(remaining));
    setProgress(prog);

    const tick = () => {
      const n = getEffectiveNow();
      setEffectiveNow(n);
      const rem = getRemainingSeconds(period, n);
      const p = getProgress(period, n);
      const w = getTimeWindow(period, n);
      setRemainingSeconds(Math.ceil(rem));
      setProgress(p);
      setTimeWindow(w);
      if (rem >= period - 0.15 || rem <= 0.15 || w !== lastWindowRef.current) {
        updateToken(n);
      }
    };

    const interval = setInterval(tick, 100);

    return () => clearInterval(interval);
  }, [period, secret, digits, algorithm, autoTick, updateToken]);

  return {
    token,
    remainingSeconds,
    progress,
    timeWindow,
    isLoading,
    effectiveNow,
  };
}
