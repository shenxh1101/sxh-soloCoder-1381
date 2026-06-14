import { useState } from 'react';
import { Copy, Dices, Upload, Download, Check, X } from 'lucide-react';
import { useTotpStore } from '@/store/useTotpStore';

export function KeyManager() {
  const { secret, setSecret, generateRandomSecret, importUri, exportUri } = useTotpStore();
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState('');

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
    const success = importUri(importValue);
    if (success) {
      setShowImport(false);
      setImportValue('');
      setImportError('');
    } else {
      setImportError('无效的 otpauth URI 格式');
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
            onChange={(e) => setSecret(e.target.value.toUpperCase())}
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 font-mono text-emerald-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
            placeholder="输入Base32密钥..."
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
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowImport(!showImport)}
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
              onChange={(e) => {
                setImportValue(e.target.value);
                setImportError('');
              }}
              placeholder="粘贴 otpauth://totp/... 格式的 URI"
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-all"
            >
              导入
            </button>
            <button
              onClick={() => {
                setShowImport(false);
                setImportError('');
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-all"
            >
              <X size={18} />
            </button>
          </div>
          {importError && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <X size={14} />
              {importError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
