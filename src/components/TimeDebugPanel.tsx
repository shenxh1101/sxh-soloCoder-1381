import { useState, useEffect, useRef, useMemo } from 'react';
import { useTotpStore, getEffectiveNow } from '@/store/useTotpStore';
import {
  Clock,
  RotateCcw,
  Plus,
  Minus,
  Calendar,
  Zap,
  Hand,
  Play,
  Pause,
  Square,
  FastForward,
  Repeat,
  Trash2,
  PlusCircle,
  GripVertical,
  List,
  History,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import type { TimeScriptStep, PlaybackTraceStep } from '@/store/useTotpStore';

type TimeMode = 'live' | 'custom';
type ScriptMode = 'preset' | 'custom';

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
  { label: '上一窗口', desc: '上一个周期开始', offset: -1 },
  { label: '当前窗口', desc: '本周期开始（归零）', offset: 0 },
  { label: '下一窗口', desc: '下一个周期开始', offset: 1 },
];

const PRESET_SCRIPTS: { label: string; desc: string; steps: Omit<TimeScriptStep, 'id'>[] }[] = [
  {
    label: '10秒步进 × 12次',
    desc: '每10秒跳一次，模拟时钟精确走过2分钟',
    steps: Array.from({ length: 12 }, (_, i) => ({
      label: `+10s #${i + 1}`,
      action: 'offset' as const,
      value: 10,
      unit: 's' as const,
    })),
  },
  {
    label: '30秒步进 × 6次',
    desc: '每次跳一个30秒周期，典型TOTP步长',
    steps: Array.from({ length: 6 }, (_, i) => ({
      label: `+30s #${i + 1}`,
      action: 'offset' as const,
      value: 30,
      unit: 's' as const,
    })),
  },
  {
    label: '1周期步进 × 10次',
    desc: '按当前步长前进，适合演示45/60秒等非默认周期',
    steps: Array.from({ length: 10 }, (_, i) => ({
      label: `+1周期 #${i + 1}`,
      action: 'offset' as const,
      value: 1,
      unit: 'period' as const,
    })),
  },
  {
    label: '窗口跳动演示',
    desc: '快速切换 -2、-1、0、+1、+2 窗口',
    steps: [
      { label: '窗口 -2', action: 'jump', value: -2, unit: 'period' },
      { label: '窗口 -1', action: 'jump', value: -1, unit: 'period' },
      { label: '窗口 0', action: 'jump', value: 0, unit: 'period' },
      { label: '窗口 +1', action: 'jump', value: 1, unit: 'period' },
      { label: '窗口 +2', action: 'jump', value: 2, unit: 'period' },
    ],
  },
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
    playback,
    setPlaybackSteps,
    addPlaybackStep,
    clearPlaybackSteps,
    setPlaybackSpeed,
    setPlaybackLoop,
    startPlayback,
    pausePlayback,
    stopPlayback,
    advancePlayback,
    clearPlaybackTrace,
    exportPlaybackTrace,
  } = useTotpStore();

  const [mode, setMode] = useState<TimeMode>('live');
  const [now, setNow] = useState<number>(Date.now());
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [scriptMode, setScriptMode] = useState<ScriptMode>('preset');
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [newStepAction, setNewStepAction] = useState<TimeScriptStep['action']>('offset');
  const [newStepValue, setNewStepValue] = useState<string>('10');
  const [newStepUnit, setNewStepUnit] = useState<TimeScriptStep['unit']>('s');
  const playbackTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    let timer: number | null = null;

    async function scheduleNext(delay?: number) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!playback.isPlaying || playback.isPaused) return;
      const useDelay = delay ?? Math.max(100, 1000 / playback.speed);
      timer = window.setTimeout(async () => {
        const res = await advancePlayback();
        if (res && !res.completed) {
          await scheduleNext(res.waitMs);
        }
      }, useDelay);
    }

    if (playback.isPlaying && !playback.isPaused) {
      void scheduleNext();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [playback.isPlaying, playback.isPaused, playback.speed, advancePlayback]);

  const effectiveNow = getEffectiveNow();
  const effectiveDate = new Date(effectiveNow);
  const realNow = now;

  const effectiveWindowStart = Math.floor(effectiveNow / 1000 / period) * period;
  const windowElapsed = Math.floor(effectiveNow / 1000) - effectiveWindowStart;

  const formattedSteps = useMemo(() => {
    return playback.steps.map((s) => {
      let displayValue = s.value.toString();
      if (s.unit === 'period') displayValue = `${s.value}周期`;
      else if (s.unit === 's') displayValue = `${s.value}s`;
      else if (s.unit === 'm') displayValue = `${s.value}m`;
      else if (s.unit === 'ms') displayValue = `${s.value}ms`;

      let actionLabel = '';
      if (s.action === 'jump') actionLabel = '跳到';
      else if (s.action === 'offset') actionLabel = '偏移';
      else if (s.action === 'wait') actionLabel = '等待';

      return { ...s, displayValue, actionLabel };
    });
  }, [playback.steps]);

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

  function handleAddStep() {
    const value = parseFloat(newStepValue);
    if (isNaN(value)) return;
    addPlaybackStep({
      label: `${newStepAction === 'jump' ? '跳到' : newStepAction === 'offset' ? '偏移' : '等待'} ${newStepValue}${newStepUnit === 'period' ? '周期' : newStepUnit}`,
      action: newStepAction,
      value,
      unit: newStepUnit,
    });
    setNewStepValue('10');
  }

  function handleLoadPreset(idx: number) {
    setPlaybackSteps(PRESET_SCRIPTS[idx].steps);
  }

  const isTimeAdjusted = mode === 'custom' || timeOffset !== 0;
  const playbackActive = playback.isPlaying || playback.steps.length > 0;

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
                    const targetSec = curStart + p.offset * period;
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

      {/* 时间脚本播放 */}
      <div className="space-y-3 border-t border-slate-700/50 pt-4">
        <button
          onClick={() => setShowScriptPanel(!showScriptPanel)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Play size={14} className="text-cyan-400" />
            时间脚本自动播放
            {playbackActive && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            )}
          </h3>
          {showScriptPanel ? (
            <Minus size={14} className="text-slate-400" />
          ) : (
            <Plus size={14} className="text-slate-400" />
          )}
        </button>

        {showScriptPanel && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex gap-2 bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => setScriptMode('preset')}
                className={`flex-1 py-1.5 px-2 text-[11px] rounded-md font-medium transition-all ${
                  scriptMode === 'preset'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                预设脚本
              </button>
              <button
                onClick={() => setScriptMode('custom')}
                className={`flex-1 py-1.5 px-2 text-[11px] rounded-md font-medium transition-all ${
                  scriptMode === 'custom'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                自定义脚本
              </button>
            </div>

            {scriptMode === 'preset' && (
              <div className="grid grid-cols-2 gap-2">
                {PRESET_SCRIPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLoadPreset(idx)}
                    className="text-left p-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-cyan-500/40 rounded-lg transition-all group"
                  >
                    <div className="text-xs font-medium text-slate-200 group-hover:text-cyan-300">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {scriptMode === 'custom' && (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <select
                    value={newStepAction}
                    onChange={(e) => setNewStepAction(e.target.value as TimeScriptStep['action'])}
                    className="bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="offset">偏移</option>
                    <option value="jump">跳到</option>
                    <option value="wait">等待</option>
                  </select>
                  <input
                    type="number"
                    value={newStepValue}
                    onChange={(e) => setNewStepValue(e.target.value)}
                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                  <select
                    value={newStepUnit}
                    onChange={(e) => setNewStepUnit(e.target.value as TimeScriptStep['unit'])}
                    className="bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="s">秒</option>
                    <option value="m">分</option>
                    <option value="ms">毫秒</option>
                    <option value="period">周期</option>
                  </select>
                  <button
                    onClick={handleAddStep}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-md text-white text-xs font-medium transition-all flex items-center gap-1"
                  >
                    <PlusCircle size={12} />
                    添加
                  </button>
                </div>
              </div>
            )}

            {formattedSteps.length > 0 && (
              <>
                <div className="bg-slate-800/40 rounded-lg overflow-hidden">
                  <div className="max-h-32 overflow-y-auto">
                    {formattedSteps.map((step, idx) => (
                      <div
                        key={step.id}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b border-slate-800 last:border-0 transition-colors ${
                          idx === playback.currentStepIndex && playback.isPlaying
                            ? 'bg-cyan-500/20'
                            : idx < playback.currentStepIndex
                            ? 'opacity-40'
                            : ''
                        }`}
                      >
                        <GripVertical size={10} className="text-slate-600" />
                        <span className="text-slate-500 font-mono w-5">{idx + 1}.</span>
                        <span className="text-cyan-400">{step.actionLabel}</span>
                        <span className="text-slate-300 font-mono">{step.displayValue}</span>
                        <span className="flex-1 text-slate-500 text-[10px] truncate ml-2">
                          {step.label}
                        </span>
                        {idx === playback.currentStepIndex && playback.isPlaying && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                    {!playback.isPlaying ? (
                      <button
                        onClick={() => startPlayback(playback.currentStepIndex > 0 && playback.currentStepIndex < formattedSteps.length)}
                        disabled={formattedSteps.length === 0}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white transition-all flex items-center gap-1"
                        title={playback.currentStepIndex > 0 ? '从当前位置继续播放' : '从头开始播放'}
                      >
                        <Play size={14} />
                      </button>
                    ) : playback.isPaused ? (
                      <button
                        onClick={() => startPlayback(true)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-md text-white transition-all"
                        title="继续播放"
                      >
                        <Play size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={pausePlayback}
                        className="p-1.5 bg-amber-600 hover:bg-amber-500 rounded-md text-white transition-all"
                        title="暂停（后续继续从当前位置播放）"
                      >
                        <Pause size={14} />
                      </button>
                    )}
                    <button
                      onClick={stopPlayback}
                      disabled={!playback.isPlaying && playback.currentStepIndex === 0}
                      className="p-1.5 bg-rose-600/80 hover:bg-rose-600 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white transition-all"
                      title="停止"
                    >
                      <Square size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <button
                      onClick={() => setPlaybackSpeed(Math.max(0.25, playback.speed / 2))}
                      className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
                    >
                      ½
                    </button>
                    <div className="px-2 text-[10px] font-mono text-cyan-400 min-w-[36px] text-center">
                      {playback.speed}x
                    </div>
                    <button
                      onClick={() => setPlaybackSpeed(Math.min(8, playback.speed * 2))}
                      className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
                    >
                      <FastForward size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => setPlaybackLoop(!playback.loop)}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs ${
                      playback.loop
                        ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                    title="循环播放"
                  >
                    <Repeat size={12} />
                  </button>

                  <button
                    onClick={clearPlaybackSteps}
                    className="p-1.5 bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 rounded-lg text-slate-400 transition-all"
                    title="清空脚本"
                  >
                    <Trash2 size={12} />
                  </button>

                  <button
                    onClick={() => setShowTrace(!showTrace)}
                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                      showTrace
                        ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/40'
                        : 'bg-slate-800/50 text-slate-400 hover:text-white border-slate-700'
                    }`}
                    title="查看执行轨迹"
                  >
                    <History size={12} />
                    {playback.trace.length > 0 && (
                      <span className="text-[10px] font-mono">{playback.trace.length}</span>
                    )}
                  </button>

                  {playback.trace.length > 0 && (
                    <button
                      onClick={clearPlaybackTrace}
                      className="p-1.5 bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 rounded-lg text-slate-400 transition-all"
                      title="清空轨迹"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {showTrace && playback.trace.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-800/40 border-b border-slate-700/50">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                        <List size={11} />
                        执行轨迹 · 共 {playback.trace.length} 步
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const text = exportPlaybackTrace();
                            navigator.clipboard.writeText(text);
                          }}
                          className="px-2 py-0.5 text-[10px] bg-slate-700/50 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-all flex items-center gap-1"
                          title="导出轨迹到剪贴板"
                        >
                          <Copy size={10} />
                          导出
                        </button>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {playback.trace.map((t: PlaybackTraceStep, i: number) => (
                        <div
                          key={t.id}
                          className="px-3 py-1.5 text-[11px] border-b border-slate-800 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 font-mono w-6 text-right">{i + 1}.</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                t.action === 'wait'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : t.action === 'jump'
                                  ? 'bg-cyan-500/20 text-cyan-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {t.action === 'wait' ? '等待' : t.action === 'jump' ? '跳到' : '偏移'}
                            </span>
                            <span className="text-slate-300 font-mono">
                              {t.value}
                              {t.unit === 'period' ? '周期' : t.unit}
                            </span>
                            <span className="ml-auto font-mono text-cyan-300 text-[11px]">
                              {t.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 pl-8">
                            <span>
                              {new Date(t.startedAt).toLocaleTimeString()}
                            </span>
                            <ArrowRight size={8} />
                            <span>
                              {new Date(t.endedAt).toLocaleTimeString()}
                            </span>
                            {t.durationMs > 0 && (
                              <span className="ml-auto">
                                耗时 {(t.durationMs / 1000).toFixed(2)}s
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {playback.isPlaying && (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 text-xs text-cyan-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      播放中：第 {playback.currentStepIndex + 1} / {formattedSteps.length} 步
                    </span>
                    <span className="text-cyan-500 font-mono">
                      {new Date(getEffectiveNow()).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

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
