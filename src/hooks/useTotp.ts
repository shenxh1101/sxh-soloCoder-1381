import { useState, useEffect, useCallback } from 'react';
import { generateTOTP, getRemainingSeconds, getProgress, getTimeWindow } from '@/utils/totp';
import type { HashAlgorithm } from '@/utils/totp';

interface UseTotpResult {
  token: string;
  remainingSeconds: number;
  progress: number;
  timeWindow: number;
  isLoading: boolean;
}

export function useTotp(
  secret: string,
  digits: number = 6,
  period: number = 30,
  algorithm: HashAlgorithm = 'SHA-1'
): UseTotpResult {
  const [token, setToken] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [timeWindow, setTimeWindow] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateToken = useCallback(async () => {
    if (!secret) {
      setToken('');
      setIsLoading(false);
      return;
    }

    try {
      const newToken = await generateTOTP(secret, { digits, period, algorithm });
      setToken(newToken);
      setIsLoading(false);
    } catch {
      setToken('');
      setIsLoading(false);
    }
  }, [secret, digits, period, algorithm]);

  useEffect(() => {
    setIsLoading(true);
    updateToken();
  }, [updateToken]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(period);
      const prog = getProgress(period);
      const window = getTimeWindow(period);

      setRemainingSeconds(Math.ceil(remaining));
      setProgress(prog);
      setTimeWindow(window);

      if (remaining >= period - 0.1 || remaining <= 0.1) {
        updateToken();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [period, updateToken]);

  return {
    token,
    remainingSeconds,
    progress,
    timeWindow,
    isLoading,
  };
}
