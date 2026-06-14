import { useState } from 'react';
import { Copy, Dices, Upload, Download, Check, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { useTotpStore } from '@/store/useTotpStore';
import { validateOtpAuthUri } from '@/utils/uri';

export function KeyManager() {
  const {
    secret,
    secretError,
    setSecret,
    generateRandomSecret,
    importUri,
    exportUri,
  } = useTotpStore();
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; msg: string; type: 'error' | 'warning' | 'success' } | null>(null);

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

  const handleLiveValidate = (value: string) => {
    setImportValue(value);
    if (!value) {
      setImportResult(null);
      return;
    }
    const result = validateOtpAuthUri(value);
    if (!result.valid) {
      setImportResult({ success: false, msg: result.errors[0], type: 'error' });
    } else if (result.warnings.length > 0) {
      setImportResult({ success: true, msg: result.warnings[0], type: 'warning' });
    } else {
      setImportResult({ success: true, msg: 'URI 格式正确，可以导入', type: 'success' });
    }
  };

  const handleImport = () => {
    const result = importUri(importValue);
    if (result.success) {
      setShowImport(false);
      setImportValue('');
      setImportResult(null);
    } else {
      setImportResult({ success: false, msg: result.error || '导入失败', type: 'error' });
    }
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
          <p className="text-red-400 text-sm flex items-start gap-1 animate-fade-in">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {secretError}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowImport(!showImport);
            setImportResult(null);
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
              onChange={(e) => handleLiveValidate(e.target.value)}
              placeholder="粘贴 otpauth://totp/... 格式的 URI"
              className={`flex-1 bg-slate-800/50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
                importResult?.type === 'error'
                  ? 'border-red-500 focus:ring-red-500/30'
                  : importResult?.type === 'success'
                  ? 'border-emerald-500 focus:ring-emerald-500/30'
                  : 'border-slate-700 focus:ring-emerald-500/50'
              }`}
              spellCheck={false}
            />
            <button
              onClick={handleImport}
              disabled={!importResult?.success}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
            >
              导入
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportResult(null);
                setImportValue('');
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-all"
            >
              <X size={18} />
            </button>
          </div>
          {importResult && (
            <p
              className={`text-sm flex items-start gap-1 animate-fade-in ${
                importResult.type === 'error'
                  ? 'text-red-400'
                  : importResult.type === 'warning'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {importResult.type === 'error' ? (
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              ) : importResult.type === 'warning' ? (
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              ) : (
                <Check size={14} className="mt-0.5 flex-shrink-0" />
              )}
              {importResult.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
