import { useState, useRef, useEffect } from 'react';
import { useTotpStore, getEffectiveNow } from '@/store/useTotpStore';
import { verifyTOTP } from '@/utils/totp';
import {
  CheckCircle,
  XCircle,
  ShieldCheck,
  RotateCcw,
  ClipboardPaste,
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Gauge,
} from 'lucide-react';

type VerificationStatus = 'idle' | 'success' | 'error';

export function Verification() {
  const {
    secret,
    digits,
    period,
    algorithm,
    verifyWindow,
    setVerifyWindow,
    verificationHistory,
    addVerificationHistory,
    clearVerificationHistory,
  } = useTotpStore();

  const [inputValue, setInputValue] = useState('');
  const [pasteValue, setPasteValue] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [offset, setOffset] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (status !== 'idle') {
      setStatus('idle');
      setOffset(null);
    }

    const cleaned = value.replace(/[^0-9]/g, '');
    const chars = inputValue.split('');
    if (cleaned.length > 1) {
      const overflow = cleaned.slice(1);
      chars[index] = cleaned[0];
      for (let i = 0; i < overflow.length && index + 1 + i < digits; i++) {
        chars[index + 1 + i] = overflow[i];
      }
    } else {
      chars[index] = cleaned.slice(-1);
    }
    const result = chars.join('').slice(0, digits);
    setInputValue(result);

    if (cleaned && index < digits - 1 && cleaned.length === 1) {
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

  const handlePasteBox = async () => {
    const cleaned = pasteValue.replace(/\D/g, '').slice(0, digits);
    if (cleaned.length === digits) {
      setInputValue(cleaned);
      setPasteValue('');
      await handleVerify(cleaned);
    }
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const text = e.clipboardData?.getData('text') || '';
      const nums = text.replace(/\D/g, '');
      if (nums.length === digits) {
        e.preventDefault();
        setInputValue(nums);
        handleVerify(nums);
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [digits, secret, period, algorithm, verifyWindow]);

  const handleVerify = async (token: string) => {
    if (token.length !== digits) return;

    setIsVerifying(true);
    try {
      const result = await verifyTOTP(token, secret, {
        digits,
        period,
        algorithm,
        window: verifyWindow,
        nowTimestamp: getEffectiveNow(),
      });

      if (result.valid) {
        setStatus('success');
        setOffset(result.offset);
      } else {
        setStatus('error');
        setOffset(null);
      }

      addVerificationHistory({
        input: token,
        valid: result.valid,
        offset: result.offset,
        window: verifyWindow,
      });

      if (verificationHistory.length === 0) {
        setShowHistory(true);
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
    setPasteValue('');
    inputRefs.current[0]?.focus();
  };

  useEffect(() => {
    handleReset();
  }, [digits, secret]);

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  function offsetLabel(o: number | null): string {
    if (o === null) return '—';
    if (o === 0) return '当前窗口';
    return `${o > 0 ? '+' : ''}${o} 窗口`;
  }

  function offsetBadgeClass(o: number | null): string {
    if (o === null) return 'bg-slate-700/60 text-slate-400';
    if (o === 0) return 'bg-emerald-900/40 text-emerald-400';
    return 'bg-amber-900/40 text-amber-400';
  }

  return (
    <div className="card-glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          验证 TOTP 码
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-1">
            <Gauge size={12} />
            容错窗口
          </label>
          <select
            value={verifyWindow}
            onChange={(e) => setVerifyWindow(parseInt(e.target.value))}
            className="bg-slate-800/70 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer"
          >
            {[0, 1, 2, 3].map((w) => (
              <option key={w} value={w}>
                ±{w}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 逐格输入 */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
          <ShieldCheck size={12} />
          逐格输入（{digits} 位数字）
        </label>
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
      </div>

      {/* 粘贴输入 */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1.5">
          <ClipboardPaste size={12} />
          整段粘贴（页面任意处 Ctrl+V 也可触发）
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value.replace(/\D/g, '').slice(0, digits))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasteBox();
            }}
            placeholder={`粘贴 ${digits} 位数字...`}
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 font-mono text-purple-300 tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <button
            onClick={handlePasteBox}
            disabled={pasteValue.length !== digits || isVerifying}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
          >
            粘贴验证
          </button>
        </div>
      </div>

      {/* 状态提示 */}
      {status !== 'idle' && (
        <div
          className={`animate-fade-in flex items-center justify-between p-4 rounded-xl ${
            status === 'success'
              ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-900/20 text-red-400 border border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            {status === 'success' ? (
              <>
                <CheckCircle size={22} />
                <div>
                  <span className="font-semibold">验证成功</span>
                  {offset !== null && offset !== 0 && (
                    <span className="text-sm ml-2 opacity-80">
                      （命中{offset > 0 ? '未来' : '过去'}第 {Math.abs(offset)} 窗口）
                    </span>
                  )}
                  {offset === 0 && (
                    <span className="text-sm ml-2 opacity-80">（完美命中当前窗口）</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle size={22} />
                <span className="font-semibold">验证失败，密码不正确</span>
              </>
            )}
          </div>
          {offset !== null && (
            <span
              className={`text-[10px] font-mono px-2 py-1 rounded-full ${offsetBadgeClass(
                offset
              )}`}
            >
              offset={offset}
            </span>
          )}
        </div>
      )}

      {/* 操作按钮 */}
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
        容错窗口 ±{verifyWindow}，支持 {verifyWindow * 2 + 1} 个时间窗口验证
      </p>

      {/* 历史记录 */}
      {verificationHistory.length > 0 && (
        <div className="border-t border-slate-700/50 pt-4 space-y-3">
          <button
            onClick={() => setHistoryCollapsed(!historyCollapsed)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <History size={14} className="text-slate-400" />
              验证历史
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {verificationHistory.length}
              </span>
            </span>
            {historyCollapsed ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronUp size={16} className="text-slate-400" />
            )}
          </button>

          {!historyCollapsed && (
            <div className="animate-fade-in space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 px-2">
                <div className="flex items-center gap-8">
                  <span>时间</span>
                  <span>输入</span>
                </div>
                <div className="flex items-center gap-8">
                  <span>命中窗口</span>
                </div>
              </div>
              <div className="max-h-[240px] overflow-y-auto space-y-1 pr-1">
                {verificationHistory.map((h) => (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      h.valid
                        ? 'bg-emerald-500/5 border border-emerald-500/10'
                        : 'bg-rose-500/5 border border-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock size={11} />
                        {formatTime(h.timestamp)}
                      </span>
                      <code
                        className={`font-mono tracking-wider ${
                          h.valid ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {h.input}
                      </code>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${offsetBadgeClass(
                          h.offset
                        )}`}
                      >
                        {offsetLabel(h.offset)}
                      </span>
                      {h.valid ? (
                        <CheckCircle size={13} className="text-emerald-400" />
                      ) : (
                        <XCircle size={13} className="text-rose-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={clearVerificationHistory}
                className="w-full py-1.5 text-[11px] text-slate-500 hover:text-rose-400 transition-all flex items-center justify-center gap-1"
              >
                <Trash2 size={11} />
                清空历史
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
