import { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useTotpStore } from '@/store/useTotpStore';
import { generateOtpAuthUri } from '@/utils/uri';
import { QrCode, User, Building } from 'lucide-react';

export function QrCodeSection() {
  const { secret, digits, period, algorithm, issuer, account, setIssuer, setAccount } = useTotpStore();

  const otpAuthUri = useMemo(() => {
    return generateOtpAuthUri({
      secret,
      issuer,
      account,
      digits,
      period,
      algorithm,
    });
  }, [secret, issuer, account, digits, period, algorithm]);

  return (
    <div className="card-glass rounded-2xl p-6 space-y-5">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
        Google Authenticator
      </h2>

      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-xl">
          <QRCodeCanvas
            value={otpAuthUri}
            size={180}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        </div>

        <p className="text-sm text-slate-400 text-center">
          使用 Google Authenticator 或其他 TOTP 应用扫描添加
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm text-slate-400 flex items-center gap-2">
            <Building size={14} />
            发行方 (Issuer)
          </label>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="例如：MyApp"
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-400 flex items-center gap-2">
            <User size={14} />
            账户名
          </label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="例如：user@example.com"
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-slate-400 flex items-center gap-2">
          <QrCode size={14} />
          otpauth URI
        </label>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <code className="text-xs text-emerald-400 break-all font-mono">
            {otpAuthUri}
          </code>
        </div>
      </div>
    </div>
  );
}
