import { KeyManager } from '@/components/KeyManager';
import { ParamsSettings } from '@/components/ParamsSettings';
import { TotpDisplay } from '@/components/TotpDisplay';
import { Verification } from '@/components/Verification';
import { QrCodeSection } from '@/components/QrCodeSection';
import { TimeDebugPanel } from '@/components/TimeDebugPanel';
import { RfcTestPanel } from '@/components/RfcTestPanel';
import { BatchTestPanel } from '@/components/BatchTestPanel';
import { DualClockPanel } from '@/components/DualClockPanel';
import { Shield, Clock, Hash, Key, BookOpen, Timer, Sparkles, Play, Table, ArrowLeftRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              TOTP 验证器演示
            </h1>
          </div>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm">
            基于时间戳的一次性密码（Time-based One-Time Password）在线演示工具
            <br className="hidden sm:block" />
            支持 Google Authenticator · RFC 6238 标准 · 完整调试能力
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings & Debug */}
          <div className="space-y-6">
            <KeyManager />
            <ParamsSettings />
            <TimeDebugPanel />
            <Verification />
            <DualClockPanel />
            <BatchTestPanel />
          </div>

          {/* Right Column - Display & QR */}
          <div className="space-y-6">
            <TotpDisplay />
            <QrCodeSection />

            <div className="grid grid-cols-3 gap-3">
              <div className="card-glass rounded-xl p-3.5 text-center group hover:border-blue-500/30 transition-all cursor-default">
                <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Time Sync
                </div>
                <div className="text-xs font-medium text-slate-200">NTP 标准</div>
              </div>
              <div className="card-glass rounded-xl p-3.5 text-center group hover:border-emerald-500/30 transition-all cursor-default">
                <Hash className="w-5 h-5 text-emerald-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Algorithm
                </div>
                <div className="text-xs font-medium text-slate-200">RFC 6238</div>
              </div>
              <div className="card-glass rounded-xl p-3.5 text-center group hover:border-purple-500/30 transition-all cursor-default">
                <Key className="w-5 h-5 text-purple-400 mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                  Key Format
                </div>
                <div className="text-xs font-medium text-slate-200">Base32</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card-glass rounded-xl p-3.5 flex items-center gap-3 hover:border-cyan-500/30 transition-all cursor-default">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Timer size={18} className="text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">时间调试</div>
                  <div className="text-[10px] text-slate-500">偏移/绝对/脚本播放</div>
                </div>
              </div>
              <div className="card-glass rounded-xl p-3.5 flex items-center gap-3 hover:border-indigo-500/30 transition-all cursor-default">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Sparkles size={18} className="text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">RFC 自检</div>
                  <div className="text-[10px] text-slate-500">18 组标准向量</div>
                </div>
              </div>
              <div className="card-glass rounded-xl p-3.5 flex items-center gap-3 hover:border-rose-500/30 transition-all cursor-default">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <Table size={18} className="text-rose-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">批量回归</div>
                  <div className="text-[10px] text-slate-500">方案库 + 快照</div>
                </div>
              </div>
              <div className="card-glass rounded-xl p-3.5 flex items-center gap-3 hover:border-amber-500/30 transition-all cursor-default">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Play size={18} className="text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">时间脚本</div>
                  <div className="text-[10px] text-slate-500">暂停续播 + 轨迹</div>
                </div>
              </div>
              <div className="card-glass rounded-xl p-3.5 flex items-center gap-3 hover:border-teal-500/30 transition-all cursor-default col-span-2">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <ArrowLeftRight size={18} className="text-teal-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">双端时钟漂移</div>
                  <div className="text-[10px] text-slate-500">设备 A/B 独立时间/步长/算法对照</div>
                </div>
              </div>
            </div>

            <RfcTestPanel />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 text-center text-slate-600 text-xs space-y-1">
          <p>仅供学习和演示用途 · 所有计算均在浏览器本地完成 · Web Crypto API</p>
          <p>参考标准：RFC 6238 (TOTP) · RFC 4226 (HOTP) · Key URI Format (Google)</p>
        </footer>
      </div>
    </div>
  );
}
