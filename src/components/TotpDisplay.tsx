import { useTotpStore } from '@/store/useTotpStore';
import { useTotp } from '@/hooks/useTotp';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function TotpDisplay() {
  const { secret, digits, period, algorithm } = useTotpStore();
  const { token, remainingSeconds, progress, isLoading } = useTotp(secret, digits, period, algorithm);
  const [copied, setCopied] = useState(false);

  const isWarning = remainingSeconds <= 5;
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card-glass rounded-2xl p-8 glow-box">
      <div className="flex flex-col items-center space-y-6">
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
            {isLoading ? (
              <RefreshCw size={32} className="text-slate-500 animate-spin" />
            ) : (
              <>
                <div
                  className={`font-mono text-5xl font-bold tracking-widest transition-colors duration-300 ${
                    isWarning ? 'text-orange-400' : 'text-emerald-400 glow-text'
                  }`}
                >
                  {token || '------'}
                </div>
                <button
                  onClick={handleCopy}
                  className="mt-3 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
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
            <div className="text-4xl font-bold font-mono text-slate-200">{period}s</div>
            <div className="text-sm text-slate-500">周期</div>
          </div>
          <div className="w-px h-12 bg-slate-700"></div>
          <div className="text-center">
            <div className="text-4xl font-bold font-mono text-slate-200">{digits}</div>
            <div className="text-sm text-slate-500">位数</div>
          </div>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isWarning ? 'bg-orange-500' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            }`}
            style={{ width: `${100 - progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
