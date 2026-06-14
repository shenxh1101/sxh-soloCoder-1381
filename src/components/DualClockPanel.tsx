import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Gauge,
  Hash,
  Clock,
  Zap,
  Copy,
  ArrowLeftRight,
  Save,
  Plus,
} from 'lucide-react';
import { useTotpStore } from '@/store/useTotpStore';
import type { HashAlgorithm } from '@/utils/totp';
import { generateTOTP } from '@/utils/totp';

export function DualClockPanel() {
  const {
    dualClock,
    setDualClockEnabled,
    setDualClockDevice,
    syncDualClockFromMain,
    secret: mainSecret,
    period: mainPeriod,
    algorithm: mainAlgorithm,
    digits: mainDigits,
  } = useTotpStore();

  const [expanded, setExpanded] = useState(false);
  const [codeA, setCodeA] = useState('------');
  const [codeB, setCodeB] = useState('------');
  const [remainA, setRemainA] = useState(0);
  const [remainB, setRemainB] = useState(0);

  const driftSeconds = useMemo(() => {
    return dualClock.deviceB.timeOffset - dualClock.deviceA.timeOffset;
  }, [dualClock.deviceA.timeOffset, dualClock.deviceB.timeOffset]);

  useEffect(() => {
    if (!expanded || !dualClock.enabled) return;
    let raf = 0;
    async function tick() {
      const now = Date.now();
      const tA = now + dualClock.deviceA.timeOffset * 1000;
      const tB = now + dualClock.deviceB.timeOffset * 1000;
      const cA = await generateTOTP(dualClock.deviceA.secret, {
        digits: dualClock.deviceA.digits,
        period: dualClock.deviceA.period,
        algorithm: dualClock.deviceA.algorithm,
        timestamp: tA,
      });
      const cB = await generateTOTP(dualClock.deviceB.secret, {
        digits: dualClock.deviceB.digits,
        period: dualClock.deviceB.period,
        algorithm: dualClock.deviceB.algorithm,
        timestamp: tB,
      });
      setCodeA(cA);
      setCodeB(cB);
      setRemainA(dualClock.deviceA.period - Math.floor((tA / 1000) % dualClock.deviceA.period));
      setRemainB(dualClock.deviceB.period - Math.floor((tB / 1000) % dualClock.deviceB.period));
      raf = window.setTimeout(tick, 500);
    }
    tick();
    return () => clearTimeout(raf);
  }, [expanded, dualClock.enabled, dualClock.deviceA, dualClock.deviceB]);

  function formatTime(offset: number): string {
    const d = new Date(Date.now() + offset * 1000);
    return d.toLocaleTimeString();
  }

  function DeviceCard(props: { device: 'A' | 'B' }) {
    const device = props.device === 'A' ? dualClock.deviceA : dualClock.deviceB;
    const code = props.device === 'A' ? codeA : codeB;
    const remain = props.device === 'A' ? remainA : remainB;
    const accent = props.device === 'A' ? 'cyan' : 'rose';
    const codeColor = props.device === 'A' ? 'text-cyan-300' : 'text-rose-300';
    const barColor = props.device === 'A' ? 'bg-cyan-500' : 'bg-rose-500';
    const borderColor = props.device === 'A' ? 'border-cyan-500/20' : 'border-rose-500/20';
    const bgColor = props.device === 'A' ? 'bg-cyan-500/5' : 'bg-rose-500/5';

    return (
      <div className={`${bgColor} border ${borderColor} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <input
            value={device.label}
            onChange={(e) => setDualClockDevice(props.device, { label: e.target.value })}
            className={`bg-transparent text-sm font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-${accent}-500/40 rounded px-1 w-40`}
          />
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Clock size={10} />
            {formatTime(device.timeOffset)}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <code className={`text-3xl font-mono font-bold tracking-[0.3em] ${codeColor}`}>
            {code}
          </code>
          <div className="text-right">
            <div className="text-[10px] text-slate-500">剩余有效</div>
            <div className={`text-lg font-mono ${codeColor}`}>{remain}s</div>
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${(remain / device.period) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock size={10} />
              时间偏移 (秒)
            </label>
            <input
              type="number"
              value={device.timeOffset}
              onChange={(e) =>
                setDualClockDevice(props.device, { timeOffset: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full mt-1 bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 flex items-center gap-1">
              <Gauge size={10} />
              周期 (秒)
            </label>
            <input
              type="number"
              min={1}
              value={device.period}
              onChange={(e) =>
                setDualClockDevice(props.device, { period: Math.max(1, parseInt(e.target.value, 10) || 30) })
              }
              className="w-full mt-1 bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 flex items-center gap-1">
              <Hash size={10} />
              位数
            </label>
            <select
              value={device.digits}
              onChange={(e) =>
                setDualClockDevice(props.device, { digits: parseInt(e.target.value, 10) as 6 | 7 | 8 })
              }
              className="w-full mt-1 bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            >
              <option value={6}>6 位</option>
              <option value={7}>7 位</option>
              <option value={8}>8 位</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 flex items-center gap-1">
              <Zap size={10} />
              算法
            </label>
            <select
              value={device.algorithm}
              onChange={(e) =>
                setDualClockDevice(props.device, { algorithm: e.target.value as HashAlgorithm })
              }
              className="w-full mt-1 bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            >
              <option value="SHA-1">SHA-1</option>
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-512">SHA-512</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-500">Base32 密钥</label>
          <div className="mt-1 flex gap-1">
            <input
              value={device.secret}
              onChange={(e) =>
                setDualClockDevice(props.device, { secret: e.target.value.toUpperCase() })
              }
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              spellCheck={false}
            />
            <button
              onClick={() => navigator.clipboard.writeText(device.secret)}
              className="p-1.5 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-all"
              title="复制密钥"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        <div className="flex gap-1 pt-1">
          <button
            onClick={() => syncDualClockFromMain(props.device)}
            className="flex-1 py-1.5 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-md text-[10px] text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1"
            title="从主配置同步密钥/周期/位数/算法"
          >
            <Save size={10} />
            同步主配置
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <ArrowLeftRight size={18} className="text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              双端时钟漂移对照
              <label className="inline-flex items-center gap-1 ml-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dualClock.enabled}
                  onChange={(e) => {
                    setDualClockEnabled(e.target.checked);
                    if (e.target.checked) setExpanded(true);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 accent-amber-500"
                />
                <span className="text-[10px] font-normal text-slate-400">启用</span>
              </label>
            </h3>
            <p className="text-xs text-slate-500">
              左右两端设备模拟不同时间/步长/算法，直观查看时钟漂移影响
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {expanded && dualClock.enabled && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          <div className="bg-slate-800/40 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">两端时间差</div>
              <div
                className={`text-lg font-mono font-bold ${
                  Math.abs(driftSeconds) === 0
                    ? 'text-emerald-400'
                    : Math.abs(driftSeconds) <= 30
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {driftSeconds > 0 ? '+' : ''}
                {driftSeconds} 秒
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">主配置参考</div>
              <div className="text-xs font-mono text-slate-500">
                周期 {mainPeriod}s · {mainDigits}位 · {mainAlgorithm.replace('SHA-', 'SHA')}
              </div>
              <button
                onClick={() => syncDualClockFromMain('both')}
                className="mt-1 px-2 py-0.5 bg-slate-700/50 hover:bg-slate-700 rounded text-[10px] text-slate-300 hover:text-white transition-all flex items-center gap-1 ml-auto"
              >
                <Plus size={10} />
                同步两端
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DeviceCard device="A" />
            <DeviceCard device="B" />
          </div>

          <div className="bg-slate-800/40 rounded-lg p-3 text-[11px] text-slate-400 space-y-1">
            <p>
              💡 演示说明：把 <span className="text-cyan-400">设备 A</span> 视为服务器（时间=0），{' '}
              <span className="text-rose-400">设备 B</span> 视为客户端（偏移=+45s），
              可以直观看到为什么客户端会命中服务器的「上一窗口」或「下一窗口」。
            </p>
            <p>
              调整两端的 <span className="text-slate-300">周期/算法/位数</span> 还可以演示不同步长场景下的漂移差异。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
