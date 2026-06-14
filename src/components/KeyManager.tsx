import { useMemo, useState } from 'react';
import { Copy, Dices, Upload, Download, Check, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useTotpStore } from '@/store/useTotpStore';
import { validateOtpAuthUri } from '@/utils/uri';
import { validateBase32 } from '@/utils/base32';

export function KeyManager() {
  const {
    secret,
    setSecret,
    generateRandomSecret,
    importUri,
    exportUri,
  } = useTotpStore();
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importValue, setImportValue] = useState('');

  const secretValidation = useMemo(() => validateBase32(secret), [secret]);
  const secretError = secretValidation.errors[0] || null;

  const uriValidation = useMemo(() => {
    if (!importValue) return null;
    return validateOtpAuthUri(importValue);
  }, [importValue]);

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportUri = async () => {
    const uri = exportUri();
    await navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!uriValidation?.valid) return;
    const result = importUri(importValue);
    if (result.success) {
      setShowImport(false);
      setImportValue('');
    }
  };

  const renderSecretHighlight = (text: string, invalidPositions: number[]) => {
    if (!text || invalidPositions.length === 0) return text;
    return (
      <span className="font-mono text-sm">
        {text.split('').map((ch, i) => (
          <span
            key={i}
            className={invalidPositions.includes(i) ? 'bg-red-500/30 text-red-300 rounded px-0.5' : ''}
          >
            {ch}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="card-glass rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        密钥管理
      </h2>

      <div className="space-y-2">
        <label className="text-sm text-slate-400">Base32 密钥</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className={`flex-1 bg-slate-800/50 border rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 transition-all ${
              secretError
                ? 'border-red-500 text-red-400 focus:ring-red-500/50 focus:border-red-500/50'
                : 'border-slate-700 text-emerald-400 focus:ring-emerald-500/50 focus:border-emerald-500/50'
            }`}
            placeholder="输入Base32密钥 (A-Z, 2-7)"
            spellCheck={false}
          />
          <button
            onClick={handleCopySecret}
            className="px-3 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all"
            title="复制密钥"
          >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
          </button>
          <button
            onClick={() => generateRandomSecret(16)}
            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all flex items-center gap-1.5"
            title="随机生成密钥"
          >
            <Dices size={18} />
            <span className="text-sm font-medium">生成</span>
          </button>
        </div>

        {secretError && (
          <div className="animate-fade-in space-y-1">
            <p className="text-red-400 text-sm flex items-start gap-1">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              {secretError}
            </p>
            {secretValidation.invalidPositions.length > 0 && (
              <p className="text-slate-400 text-xs pl-5">
                错误字符已高亮：{renderSecretHighlight(secret, secretValidation.invalidPositions)}
              </p>
            )}
          </div>
        )}

        {!secretError && secretValidation.warnings.length > 0 && (
          <div className="animate-fade-in space-y-1">
            {secretValidation.warnings.map((w, i) => (
              <p key={i} className="text-amber-400 text-sm flex items-start gap-1">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowImport(!showImport);
            setImportValue('');
          }}
          className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Upload size={16} />
          导入 URI
        </button>
        <button
          onClick={handleExportUri}
          className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Download size={16} />
          导出 URI
        </button>
      </div>

      {showImport && (
        <div className="animate-fade-in space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder="粘贴 otpauth://totp/... 格式的 URI"
              className={`flex-1 bg-slate-800/50 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                uriValidation?.errors.length
                  ? 'border-red-500 focus:ring-red-500/30'
                  : uriValidation
                  ? 'border-emerald-500 focus:ring-emerald-500/30'
                  : 'border-slate-700 focus:ring-emerald-500/50'
              }`}
              spellCheck={false}
            />
            <button
              onClick={handleImport}
              disabled={!uriValidation?.valid}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
            >
              导入
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportValue('');
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {uriValidation && (
            <div className="space-y-1 animate-fade-in">
              {uriValidation.errors.length > 0 && (
                <div className="space-y-1">
                  {uriValidation.errors.map((err, i) => (
                    <p key={i} className="text-red-400 text-sm flex items-start gap-1">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      {err}
                    </p>
                  ))}
                  {Object.keys(uriValidation.paramErrors).length > 0 && (
                    <div className="mt-2 pl-5 space-y-1">
                      {Object.entries(uriValidation.paramErrors).map(([param, msg]) => (
                        <p key={param} className="text-xs text-slate-400">
                          <span className="text-slate-500 font-mono">{param}:</span>{' '}
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {uriValidation.valid && uriValidation.warnings.length > 0 && (
                <div className="space-y-1">
                  {uriValidation.warnings.map((w, i) => (
                    <p key={i} className="text-amber-400 text-sm flex items-start gap-1">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {uriValidation.valid && uriValidation.warnings.length === 0 && (
                <p className="text-emerald-400 text-sm flex items-start gap-1">
                  <Check size={14} className="mt-0.5 flex-shrink-0" />
                  URI 格式完全正确，可以安全导入
                </p>
              )}

              {uriValidation.valid && importValue.includes('?') && (
                <div className="mt-2 bg-slate-800/50 rounded-lg p-3 text-xs space-y-1">
                  <p className="text-slate-500 flex items-center gap-1">
                    <Info size={12} />
                    解析预览：
                  </p>
                  {(() => {
                    try {
                      const params = new URLSearchParams(importValue.split('?')[1]);
                      return (
                        <div className="grid grid-cols-2 gap-1 pl-4">
                          {['secret', 'digits', 'period', 'algorithm', 'issuer'].map((k) => {
                            const v = params.get(k);
                            if (!v) return null;
                            return (
                              <p key={k}>
                                <span className="text-slate-500">{k}:</span>{' '}
                                <span className={`font-mono ${
                                  uriValidation.paramErrors[k as keyof typeof uriValidation.paramErrors]
                                    ? 'text-red-400'
                                    : 'text-emerald-400'
                                }`}>{v}</span>
                              </p>
                            );
                          })}
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
