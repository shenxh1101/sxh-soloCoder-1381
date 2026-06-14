import { useTotpStore } from '@/store/useTotpStore';
import type { HashAlgorithm } from '@/utils/totp';
import { Settings, Clock, Hash, Shield } from 'lucide-react';

export function ParamsSettings() {
  const { digits, period, algorithm, setDigits, setPeriod, setAlgorithm } = useTotpStore();

  return (
    <div className="card-glass rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
        参数设置
      </h2>

      <div className="space-y-2">
        <label className="text-sm text-slate-400 flex items-center gap-2">
          <Clock size={14} />
          步长（秒）
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="15"
            max="120"
            step="5"
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <input
            type="number"
            value={period}
            onChange={(e) => setPeriod(Math.max(1, parseInt(e.target.value) || 30))}
            className="w-20 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-center font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <p className="text-xs text-slate-500">密码的有效时间周期，默认 30 秒</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-400 flex items-center gap-2">
          <Hash size={14} />
          密码位数
        </label>
        <div className="flex gap-2">
          {[6, 7, 8].map((d) => (
            <button
              key={d}
              onClick={() => setDigits(d)}
              className={`flex-1 py-2.5 rounded-lg font-mono text-base font-medium transition-all ${
                digits === d
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
              }`}
            >
              {d} 位
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-400 flex items-center gap-2">
          <Shield size={14} />
          哈希算法
        </label>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as HashAlgorithm)}
          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
        >
          <option value="SHA-1">SHA-1 (Google Authenticator 默认)</option>
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-512">SHA-512</option>
        </select>
      </div>
    </div>
  );
}
