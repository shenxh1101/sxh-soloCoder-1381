import { KeyManager } from '@/components/KeyManager';
import { ParamsSettings } from '@/components/ParamsSettings';
import { TotpDisplay } from '@/components/TotpDisplay';
import { Verification } from '@/components/Verification';
import { QrCodeSection } from '@/components/QrCodeSection';
import { Shield, Clock, Hash, QrCode, Key } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              TOTP 验证器演示
            </h1>
          </div>
          <p className="text-slate-400 max-w-2xl mx-auto">
            基于时间戳的一次性密码（Time-based One-Time Password）在线演示工具
            <br />
            支持 Google Authenticator、Authy 等主流双因素认证应用
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            <KeyManager />
            <ParamsSettings />
            <Verification />
          </div>

          {/* Right Column - Display */}
          <div className="space-y-6">
            <TotpDisplay />
            <QrCodeSection />

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card-glass rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="text-xs text-slate-400">时间同步</div>
                <div className="text-sm font-medium text-slate-200">NTP 标准</div>
              </div>
              <div className="card-glass rounded-xl p-4 text-center">
                <Hash className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-xs text-slate-400">算法标准</div>
                <div className="text-sm font-medium text-slate-200">RFC 6238</div>
              </div>
              <div className="card-glass rounded-xl p-4 text-center">
                <Key className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <div className="text-xs text-slate-400">密钥格式</div>
                <div className="text-sm font-medium text-slate-200">Base32</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>仅供学习和演示用途 · 所有计算均在浏览器本地完成</p>
        </footer>
      </div>
    </div>
  );
}
