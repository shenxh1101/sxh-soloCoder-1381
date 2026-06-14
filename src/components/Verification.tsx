import { useState, useRef, useEffect } from 'react';
import { useTotpStore } from '@/store/useTotpStore';
import { verifyTOTP } from '@/utils/totp';
import { CheckCircle, XCircle, ShieldCheck, RotateCcw } from 'lucide-react';

type VerificationStatus = 'idle' | 'success' | 'error';

export function Verification() {
  const { secret, digits, period, algorithm } = useTotpStore();
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [offset, setOffset] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (status !== 'idle') {
      setStatus('idle');
      setOffset(null);
    }

    const newValue = value.replace(/[^0-9]/g, '');
    const chars = inputValue.split('');
    chars[index] = newValue.slice(-1);
    const result = chars.join('').slice(0, digits);
    setInputValue(result);

    if (newValue && index < digits - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (result.length === digits) {
      handleVerify(result);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (token: string) => {
    if (token.length !== digits) return;

    setIsVerifying(true);
    try {
      const result = await verifyTOTP(token, secret, {
        digits,
        period,
        algorithm,
        window: 1,
      });

      if (result.valid) {
        setStatus('success');
        setOffset(result.offset);
      } else {
        setStatus('error');
        setOffset(null);
      }
    } catch {
      setStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setInputValue('');
    setStatus('idle');
    setOffset(null);
    inputRefs.current[0]?.focus();
  };

  useEffect(() => {
    handleReset();
  }, [digits, secret]);

  return (
    <div className="card-glass rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        验证 TOTP 码
      </h2>

      <div className="flex justify-center gap-2">
        {Array.from({ length: digits }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={inputValue[index] || ''}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`w-12 h-14 text-center text-2xl font-mono font-bold rounded-xl border-2 transition-all focus:outline-none ${
              status === 'success'
                ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
                : status === 'error'
                ? 'bg-red-900/30 border-red-500 text-red-400 animate-shake'
                : 'bg-slate-800/50 border-slate-700 text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
            }`}
          />
        ))}
      </div>

      {status !== 'idle' && (
        <div
          className={`animate-fade-in flex items-center justify-center gap-3 p-4 rounded-xl ${
            status === 'success' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-red-900/20 text-red-400'
          }`}
        >
          {status === 'success' ? (
            <>
              <CheckCircle size={24} />
              <div>
                <span className="font-semibold">验证成功！</span>
                {offset !== null && offset !== 0 && (
                  <span className="text-sm ml-2 opacity-75">
                    ({offset > 0 ? '+' : ''}{offset} 个时间窗口偏移)
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle size={24} />
              <span className="font-semibold">验证失败，密码不正确</span>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          重置
        </button>
        <button
          onClick={() => handleVerify(inputValue)}
          disabled={inputValue.length !== digits || isVerifying}
          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2"
        >
          <ShieldCheck size={16} />
          验证
        </button>
      </div>

      <p className="text-xs text-slate-500 text-center">
        输入 {digits} 位一次性密码进行验证，支持 ±1 个时间窗口容错
      </p>
    </div>
  );
}
