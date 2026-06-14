import { useState, useEffect } from 'react';
import { useTotpStore, getEffectiveNow } from '@/store/useTotpStore';
import {
  Clock,
  RotateCcw,
  Plus,
  Minus,
  Calendar,
  Zap,
  Hand,
} from 'lucide-react';

type TimeMode = 'live' | 'custom';

const TIME_PRESETS = [
  { label: '现在', delta: 0 },
  { label: '-30s', delta: -30 },
  { label: '-1m', delta: -60 },
  { label: '-5m', delta: -300 },
  { label: '+30s', delta: 30 },
  { label: '+1m', delta: 60 },
  { label: '+5m', delta: 300 },
];

const WINDOW_PRESETS = [
  { label: '上一窗口', desc: '上一个周期开始', delta: -30 },
  { label: '当前窗口', desc: '本周期开始（归零）', delta: 0 },
  { label: '下一窗口', desc: '下一个周期开始', delta: 30 },
];

export function TimeDebugPanel() {
  const {
    timeOffset,
    customTime,
    period,
    setTimeOffset,
    setCustomTime,
    adjustTimeOffset,
    resetTime,
  } = useTotpStore();

  const [mode, setMode] = useState<TimeMode>('live');
  const [now, setNow] = useState<number>(Date.now());
  const [customDateTime, setCustomDateTime] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mode === 'live') {
      setCustomTime(null);
    }
  }, [mode, setCustomTime]);

  const effectiveNow = getEffectiveNow();
  const effectiveDate = new Date(effectiveNow);
  const realNow = now;

  const effectiveWindowStart = Math.floor(effectiveNow / 1000 / period) * period;
  const windowElapsed = Math.floor(effectiveNow / 1000) - effectiveWindowStart;

  function formatDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function handleCustomDateTimeChange(value: string) {
    setCustomDateTime(value);
    if (!value) return;
    const ms = new Date(value).getTime();
    if (!isNaN(ms)) {
      setCustomTime(ms);
    }
  }

  const isTimeAdjusted = mode === 'custom' || timeOffset !== 0;

  return (
    <div className="card-glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          时间调试
        </h2>
        <div className="flex bg-slate-800/70 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => {
              setMode('live');
              resetTime();
            }}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              mode === 'live'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Zap size={12} />
              实时
            </span>
          </button>
          <button
            onClick={() => {
              setMode('custom');
              setCustomTime(getEffectiveNow());
              setCustomDateTime(formatDateTime(new Date(getEffectiveNow())));
            }}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              mode === 'custom'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Hand size={12} />
              手动
            </span>
          </button>
        </div>
      </div>

      {isTimeAdjusted && (
        <div className="animate-fade-in bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-xs flex items-start gap-2">
          <Zap size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">时间模拟生效中</span>
            <span className="opacity-75 ml-2">
              {mode === 'custom' ? '绝对时间模式' : `偏移 ${timeOffset >= 0 ? '+' : ''}${timeOffset}s`}
            </span>
          </div>
        </div>
      )}

      {/* 当前时间显示 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">真实时间</div>
          <div className="font-mono text-sm text-slate-300">
            {new Date(realNow).toLocaleTimeString()}
          </div>
        </div>
        <div
          className={`rounded-xl p-3 transition-all ${
            isTimeAdjusted
              ? 'bg-cyan-900/30 border border-cyan-500/30'
              : 'bg-slate-800/50'
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <Clock size={10} />
            有效时间
          </div>
          <div className="font-mono text-sm text-slate-200">
            {effectiveDate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* 时间窗口信息 */}
      <div className="bg-slate-800/40 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">窗口 # {Math.floor(effectiveNow / 1000 / period)}</span>
          <span className="text-slate-400">
            已用 {windowElapsed}s / {period}s
          </span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
            style={{ width: `${(windowElapsed / period) * 100}%` }}
          />
        </div>
      </div>

      {/* 实时模式：偏移量控制 */}
      {mode === 'live' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={12} />
              时间偏移（秒）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={timeOffset}
                onChange={(e) => setTimeOffset(parseInt(e.target.value) || 0)}
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 font-mono text-cyan-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => adjustTimeOffset(-1)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-slate-300"
                  title="-1秒"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => adjustTimeOffset(1)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all text-slate-300"
                  title="+1秒"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">快速偏移</div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    if (p.delta === 0) {
                      setTimeOffset(0);
                    } else {
                      adjustTimeOffset(p.delta);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-600 border border-slate-600/50 rounded-md text-xs font-mono text-slate-300 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">窗口跳转</div>
            <div className="grid grid-cols-3 gap-2">
              {WINDOW_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    const curTime = Math.floor(getEffectiveNow() / 1000);
                    const curStart = Math.floor(curTime / period) * period;
                    const targetSec = curStart + p.delta;
                    setTimeOffset(targetSec - Math.floor(Date.now() / 1000));
                  }}
                  className="py-2 px-2 bg-slate-700/60 hover:bg-cyan-900/50 hover:border-cyan-500/40 border border-slate-600/50 rounded-lg text-xs transition-all"
                >
                  <div className="font-medium text-slate-200">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 手动模式：绝对时间选择 */}
      {mode === 'custom' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar size={12} />
              绝对时间
            </label>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => handleCustomDateTimeChange(e.target.value)}
              step="1"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 [color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-500 mb-1">秒级微调</div>
            <div className="grid grid-cols-6 gap-1.5">
              {[-60, -30, -10, +10, +30, +60].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    const ct = useTotpStore.getState().customTime ?? Date.now();
                    setCustomTime(ct + d * 1000);
                    setCustomDateTime(formatDateTime(new Date(ct + d * 1000)));
                  }}
                  className="py-1.5 bg-slate-700/60 hover:bg-slate-600 border border-slate-600/50 rounded-md text-xs font-mono text-slate-300 transition-all"
                >
                  {d > 0 ? '+' : ''}{d}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1.5">Unix 时间戳 (秒)</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTime ? String(Math.floor(customTime / 1000)) : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v > 0) {
                    setCustomTime(v * 1000);
                    setCustomDateTime(formatDateTime(new Date(v * 1000)));
                  }
                }}
                placeholder="Unix timestamp"
                className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-xs text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <button
                onClick={() => {
                  setCustomTime(Date.now());
                  setCustomDateTime(formatDateTime(new Date()));
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs text-slate-300 transition-all"
              >
                跳到现在
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重置按钮 */}
      {isTimeAdjusted && (
        <button
          onClick={() => {
            resetTime();
            setMode('live');
          }}
          className="w-full py-2.5 bg-gradient-to-r from-rose-600/80 to-orange-600/80 hover:from-rose-600 hover:to-orange-600 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} />
          恢复真实时间
        </button>
      )}
    </div>
  );
}
