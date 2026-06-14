import { useState, useEffect, useMemo, useRef } from 'react';
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
  Layers,
  Minus,
  CheckCircle2,
  XCircle,
  ArrowRight,
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
  const [counterA, setCounterA] = useState(0);
  const [counterB, setCounterB] = useState(0);
  const [codesAroundA, setCodesAroundA] = useState<{ offset: number; code: string }[]>([]);

  const driftSeconds = useMemo(() => {
    return dualClock.deviceB.timeOffset - dualClock.deviceA.timeOffset;
  }, [dualClock.deviceA.timeOffset, dualClock.deviceB.timeOffset]);

  const windowDiff = useMemo(() => {
    // 用两端周期的最小公倍数来估算不太直观，这里用各自周期算出窗口差
    // 更直观：以 A 的周期为基准，B 偏移了多少个 A 的窗口
    const diffWindowsA = driftSeconds / dualClock.deviceA.period;
    return diffWindowsA;
  }, [driftSeconds, dualClock.deviceA.period]);

  const codesMatch = codeA === codeB && codeA !== '------';

  // 找出 B 的码命中了 A 的哪个偏移窗口
  const hitWindowOffset = useMemo(() => {
    if (!codesAroundA.length || codeB === '------') return null;
    const hit = codesAroundA.find((c) => c.code === codeB);
    return hit ? hit.offset : null;
  }, [codesAroundA, codeB]);

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
      setCounterA(Math.floor(tA / 1000 / dualClock.deviceA.period));
      setCounterB(Math.floor(tB / 1000 / dualClock.deviceB.period));

      // 计算 A 周围 ±3 窗口的码，用于对比 B 命中了哪个窗口
      const around: { offset: number; code: string }[] = [];
      for (let offset = -3; offset <= 3; offset++) {
        const ts = tA + offset * dualClock.deviceA.period * 1000;
        const c = await generateTOTP(dualClock.deviceA.secret, {
          digits: dualClock.deviceA.digits,
          period: dualClock.deviceA.period,
          algorithm: dualClock.deviceA.algorithm,
          timestamp: ts,
        });
        around.push({ offset, code: c });
      }
      setCodesAroundA(around);

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
    const counter = props.device === 'A' ? counterA : counterB;
    const accent = props.device === 'A' ? 'cyan' : 'rose';
    const codeColor = props.device === 'A' ? 'text-cyan-300' : 'text-rose-300';
    const barColor = props.device === 'A' ? 'bg-cyan-500' : 'bg-rose-500';
    const borderColor = props.device === 'A' ? 'border-cyan-500/20' : 'border-rose-500/20';
    const bgColor = props.device === 'A' ? 'bg-cyan-500/5' : 'bg-rose-500/5';
    const ringColor = props.device === 'A' ? 'focus:ring-cyan-500/40' : 'focus:ring-rose-500/40';

    return (
      <div className={`${bgColor} border ${borderColor} rounded-xl p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <input
            value={device.label}
            onChange={(e) => setDualClockDevice(props.device, { label: e.target.value })}
            className={`bg-transparent text-sm font-semibold text-slate-100 focus:outline-none focus:ring-1 ${ringColor} rounded px-1 w-40`}
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

        <div className="flex items-center justify-between bg-slate-900/40 rounded-md px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <Layers size={11} className="text-slate-500" />
            <span className="text-[10px] text-slate-500">窗口序号</span>
          </div>
          <code className={`text-xs font-mono ${codeColor}`}>#{counter}</code>
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
          {/* 汇总信息卡 */}
          <div className="bg-slate-800/40 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
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
              <div className="text-center">
                <div className="text-xs text-slate-400">窗口差（以 A 为基准）</div>
                <div
                  className={`text-lg font-mono font-bold ${
                    Math.abs(windowDiff) < 0.5
                      ? 'text-emerald-400'
                      : Math.abs(windowDiff) <= 1.5
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {windowDiff > 0 ? '+' : ''}
                  {windowDiff.toFixed(2)} 窗
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">验证码</div>
                {codesMatch ? (
                  <div className="text-emerald-400 text-sm font-medium flex items-center gap-1 justify-end">
                    <CheckCircle2 size={14} />
                    一致
                  </div>
                ) : (
                  <div className="text-rose-400 text-sm font-medium flex items-center gap-1 justify-end">
                    <XCircle size={14} />
                    不一致
                  </div>
                )}
              </div>
            </div>

            {/* 命中关系说明 */}
            {hitWindowOffset !== null && hitWindowOffset !== 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2 text-[11px] text-amber-300 flex items-start gap-2">
                <ArrowRight size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-rose-300 font-medium">设备 B</span> 的当前码，
                  恰好等于 <span className="text-cyan-300 font-medium">设备 A</span>{' '}
                  <span className="font-mono font-bold">
                    {hitWindowOffset > 0 ? `+${hitWindowOffset}` : hitWindowOffset} 窗口
                  </span>{' '}
                  的码。
                  <br />
                  也就是：如果服务器是 A、客户端是 B，那么 B 发过来的码会命中 A 的
                  <span className="font-mono font-bold"> {hitWindowOffset > 0 ? '未来' : '过去'} </span>
                  窗口。
                </div>
              </div>
            )}
            {hitWindowOffset === 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2 text-[11px] text-emerald-300 flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  两端落在 <span className="font-mono font-bold">同一窗口</span>，
                  验证码完全一致，时间同步良好。
                </div>
              </div>
            )}
            {hitWindowOffset === null && codesAroundA.length > 0 && (
              <div className="bg-slate-700/30 border border-slate-600/30 rounded-md p-2 text-[11px] text-slate-400 flex items-start gap-2">
                <Layers size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  B 的码不在 A 的 ±3 窗口范围内，说明两端差异较大或密钥/算法不一致。
                </div>
              </div>
            )}
          </div>

          {/* 窗口位置可视化条 */}
          <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Layers size={10} />
              窗口位置对照（以 A 的当前窗口为 0 点）
            </div>
            <div className="relative h-10 bg-slate-900/60 rounded-md overflow-hidden">
              {/* 7 个窗口分区 */}
              <div className="absolute inset-0 flex">
                {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                  const isCenter = offset === 0;
                  const isHit = hitWindowOffset === offset;
                  const aroundCode = codesAroundA.find((c) => c.offset === offset)?.code || '------';
                  return (
                    <div
                      key={offset}
                      className={`flex-1 border-r border-slate-700/50 last:border-r-0 flex flex-col items-center justify-center transition-colors ${
                        isCenter
                          ? 'bg-cyan-500/15'
                          : isHit
                          ? 'bg-amber-500/20'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <span
                        className={`text-[9px] font-mono ${
                          isCenter
                            ? 'text-cyan-400 font-bold'
                            : isHit
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {offset > 0 ? `+${offset}` : offset}
                      </span>
                      <span
                        className={`text-[9px] font-mono mt-0.5 ${
                          isHit ? 'text-amber-300' : 'text-slate-600'
                        }`}
                      >
                        {aroundCode.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* A 的位置指示器 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5">
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-cyan-400" />
              </div>
              {/* B 的位置指示器 */}
              {dualClock.deviceA.period > 0 && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 transition-all duration-500"
                  style={{
                    left: `calc(50% + ${(windowDiff / 7) * 100}%)`,
                  }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-rose-400" />
                </div>
              )}
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 px-1">
              <span className="text-cyan-400">▲ 设备 A 当前窗</span>
              <span className="text-rose-400">▼ 设备 B 位置</span>
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
