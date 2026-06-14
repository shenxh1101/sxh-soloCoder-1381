import { useTotpStore, getEffectiveNow } from '@/store/useTotpStore';
import { useTotp } from '@/hooks/useTotp';
import { RefreshCw, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { validateBase32 } from '@/utils/base32';

export function TotpDisplay() {
  const {
    secret,
    digits,
    period,
    algorithm,
    timeOffset,
    customTime,
  } = useTotpStore();

  const secretValidation = useMemo(() => validateBase32(secret), [secret]);
  const secretError = secretValidation.errors[0] || null;
  const { token, remainingSeconds, progress, isLoading } = useTotp(
    secret,
    digits,
    period,
    algorithm
  );
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const isWarning = remainingSeconds <= 5;
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isTimeAdjusted = customTime !== null || timeOffset !== 0;

  const effective = new Date(getEffectiveNow());

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-8 glow-box relative overflow-hidden">
      {isTimeAdjusted && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-900/60 to-indigo-900/60 border-b border-cyan-500/30 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px]">
          <AlertTriangle size={12} className="text-cyan-300" />
          <span className="text-cyan-200 font-medium">时间模拟生效</span>
          <span className="text-cyan-300/80 font-mono">
            {effective.toLocaleTimeString()}
          </span>
        </div>
      )}

      <div className={`flex flex-col items-center space-y-6 ${isTimeAdjusted ? 'pt-8' : ''}`}>
        {/* 时间模式状态栏 */}
        {isTimeAdjusted && (
          <div className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock size={11} />
                真实时间
              </span>
              <span className="font-mono text-slate-400">
                {new Date(now).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">模拟时间</span>
              <span className="font-mono text-cyan-400">
                {effective.toLocaleTimeString()}
                {timeOffset !== 0 && (
                  <span className="ml-1 text-amber-400/80">
                    ({timeOffset >= 0 ? '+' : ''}
                    {timeOffset}s)
                  </span>
                )}
                {customTime !== null && (
                  <span className="ml-1 text-violet-400/80">(绝对)</span>
                )}
              </span>
            </div>
          </div>
        )}

        {secretError && (
          <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-sm text-center animate-fade-in">
            ⚠️ 密钥错误：{secretError}
          </div>
        )}

        <div className="relative">
          <svg width="220" height="220" className="transform -rotate-90">
            <circle
              cx="110"
              cy="110"
              r="88"
              fill="none"
              stroke="#334155"
              strokeWidth="12"
            />
            <circle
              cx="110"
              cy="110"
              r="88"
              fill="none"
              stroke={isWarning ? '#f97316' : '#22c55e'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="progress-ring-circle"
              style={{
                filter: isWarning
                  ? 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.5))'
                  : 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))',
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isLoading || secretError ? (
              secretError ? (
                <span className="text-xs text-rose-400 font-medium px-4 text-center">
                  请修正密钥
                </span>
              ) : (
                <RefreshCw size={32} className="text-slate-500 animate-spin" />
              )
            ) : (
              <>
                <div
                  className={`font-mono tracking-widest transition-colors duration-300 ${
                    isWarning
                      ? 'text-orange-400 glow-text-placeholder'
                      : 'text-emerald-400 glow-text'
                  }`}
                  style={{
                    fontSize: digits <= 6 ? '3.25rem' : digits === 7 ? '2.75rem' : '2.4rem',
                  }}
                >
                  {token || '------'}
                </div>
                <button
                  onClick={handleCopy}
                  className="mt-2 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-xs"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>点击复制</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div
              className={`text-4xl font-bold font-mono transition-colors duration-300 ${
                isWarning ? 'text-orange-400' : 'text-slate-200'
              }`}
            >
              {remainingSeconds}
            </div>
            <div className="text-sm text-slate-500">剩余秒数</div>
          </div>
          <div className="w-px h-12 bg-slate-700"></div>
          <div className="text-center">
            <div className="text-4xl font-bold font-mono text-slate-200">
              {period}s
            </div>
            <div className="text-sm text-slate-500">周期</div>
          </div>
          <div className="w-px h-12 bg-slate-700"></div>
          <div className="text-center">
            <div className="text-4xl font-bold font-mono text-slate-200">
              {digits}
            </div>
            <div className="text-sm text-slate-500">位数</div>
          </div>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isWarning
                ? 'bg-orange-500'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            }`}
            style={{ width: `${100 - progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
