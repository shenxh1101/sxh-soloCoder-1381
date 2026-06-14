import { useState } from 'react';
import {
  Table,
  Play,
  Trash2,
  Upload,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Link,
  Copy,
  ArrowRight,
  Save,
  Folder,
  FolderOpen,
  MoreVertical,
  Clock3,
} from 'lucide-react';
import { useTotpStore } from '@/store/useTotpStore';
import type { BatchTestItem, BatchTestSuite } from '@/store/useTotpStore';

type ImportMode = 'uri' | 'text';
type SuiteView = 'none' | 'save' | 'list';

export function BatchTestPanel() {
  const {
    batchTestItems,
    batchSuites,
    runBatchTest,
    clearBatchTestItems,
    importBatchFromUris,
    importBatchFromText,
    removeBatchTestItem,
    setSecret,
    setDigits,
    setPeriod,
    setAlgorithm,
    setCustomTime,
    saveBatchSuite,
    loadBatchSuite,
    deleteBatchSuite,
    updateBatchSuite,
  } = useTotpStore();

  const [expanded, setExpanded] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('uri');
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [suiteView, setSuiteView] = useState<SuiteView>('none');
  const [suiteName, setSuiteName] = useState('');
  const [expandedSuiteId, setExpandedSuiteId] = useState<string | null>(null);

  const passCount = batchTestItems.filter((i) => i.status === 'pass').length;
  const failCount = batchTestItems.filter((i) => i.status === 'fail').length;
  const errorCount = batchTestItems.filter((i) => i.status === 'error').length;
  const pendingCount = batchTestItems.filter((i) => i.status === 'pending').length;

  function handleImport() {
    if (!importText.trim()) return;

    let result;
    if (importMode === 'uri') {
      result = importBatchFromUris(importText);
    } else {
      result = importBatchFromText(importText);
    }

    setImportErrors(result.errors);
    if (result.success > 0) {
      setImportText('');
    }
  }

  function formatTimestamp(ts: number | undefined): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  }

  function handleApplyToMain(item: BatchTestItem) {
    setSecret(item.secret);
    setDigits(item.digits);
    setPeriod(item.period);
    setAlgorithm(item.algorithm);
    if (item.testTimestamp) {
      setCustomTime(item.testTimestamp);
    }
  }

  function handleCopyActualCode(code: string) {
    navigator.clipboard.writeText(code);
  }

  return (
    <div className="card-glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Table size={18} className="text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              批量测试工作台
              {batchTestItems.length > 0 && (
                <span className="text-xs font-normal text-slate-500">
                  {batchTestItems.length} 条用例
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              多条 URI 或密钥+验证码组批量回归测试
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount === 0 && batchTestItems.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              {passCount > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                  {passCount} 通过
                </span>
              )}
              {failCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">
                  {failCount} 失败
                </span>
              )}
              {errorCount > 0 && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                  {errorCount} 错误
                </span>
              )}
            </div>
          )}
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          <div className="flex gap-2 bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setImportMode('uri')}
              className={`flex-1 py-2 px-3 text-xs rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                importMode === 'uri'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link size={12} />
              otpauth URI 批量
            </button>
            <button
              onClick={() => setImportMode('text')}
              className={`flex-1 py-2 px-3 text-xs rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
                importMode === 'text'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={12} />
              密钥+验证码组
            </button>
          </div>

          <div className="space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                importMode === 'uri'
                  ? '每行一条 otpauth URI，或用逗号/分号分隔\n例如：\notpauth://totp/Test:user1?secret=JBSWY3DPEHPK3PXP&digits=6\n...'
                  : '每行一条：密钥,验证码,[时间戳],[算法],[周期]\n例如：\nJBSWY3DPEHPK3PXP 123456\nJBSWY3DPEHPK3PXP 123456 1609459200 SHA256 30s\n...'
              }
              className="w-full h-28 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
              >
                <Upload size={14} />
                导入并解析
              </button>
              <button
                onClick={() => {
                  clearBatchTestItems();
                  setImportErrors([]);
                }}
                disabled={batchTestItems.length === 0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg text-slate-300 text-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                清空
              </button>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1">
              {importErrors.slice(0, 5).map((err, i) => (
                <p key={i} className="text-red-400 text-xs flex items-start gap-1">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  {err}
                </p>
              ))}
              {importErrors.length > 5 && (
                <p className="text-red-400/70 text-xs pl-4">
                  还有 {importErrors.length - 5} 条错误...
                </p>
              )}
            </div>
          )}

          {batchTestItems.length > 0 && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => void runBatchTest()}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Play size={16} />
                  {pendingCount > 0 ? '运行全部测试' : '重新运行测试'}
                </button>
                <button
                  onClick={() => {
                    setSuiteView(suiteView === 'save' ? 'none' : 'save');
                    if (suiteView !== 'save') setSuiteName('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    suiteView === 'save'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                  title="保存当前用例为方案"
                >
                  <Save size={14} />
                  保存方案
                </button>
                <button
                  onClick={() => setSuiteView(suiteView === 'list' ? 'none' : 'list')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    suiteView === 'list'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                  title="加载已保存方案"
                >
                  <Folder size={14} />
                  方案库
                  {batchSuites.length > 0 && (
                    <span className="ml-0.5 text-[10px] px-1.5 py-0.5 bg-slate-800 rounded-full">
                      {batchSuites.length}
                    </span>
                  )}
                </button>
              </div>

              {suiteView === 'save' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2 animate-fade-in">
                  <div className="text-xs text-amber-300 font-medium">保存为回归方案</div>
                  <div className="flex gap-2">
                    <input
                      value={suiteName}
                      onChange={(e) => setSuiteName(e.target.value)}
                      placeholder="给这组用例起个名字，如：GA v5.10 兼容回归"
                      className="flex-1 bg-slate-800/70 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                    <button
                      onClick={() => {
                        if (!suiteName.trim()) return;
                        saveBatchSuite(suiteName.trim(), true);
                        setSuiteName('');
                        setSuiteView('list');
                      }}
                      disabled={!suiteName.trim()}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-md text-white text-xs font-medium transition-all"
                    >
                      确认保存
                    </button>
                  </div>
                  <div className="text-[10px] text-amber-400/70">
                    当前 {batchTestItems.length} 条用例
                    {pendingCount === 0 && ' + 结果快照'} 会一起保存到浏览器本地
                  </div>
                </div>
              )}

              {suiteView === 'list' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-purple-300 font-medium flex items-center gap-1">
                      <FolderOpen size={12} />
                      已保存方案（{batchSuites.length}）
                    </div>
                  </div>
                  {batchSuites.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">
                      暂未保存任何方案，导入测试用例后点「保存方案」即可留存
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {batchSuites.map((s: BatchTestSuite) => (
                        <div
                          key={s.id}
                          className="bg-slate-800/60 rounded-md overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-2.5 py-2">
                            <button
                              onClick={() =>
                                setExpandedSuiteId(expandedSuiteId === s.id ? null : s.id)
                              }
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                {expandedSuiteId === s.id ? (
                                  <ChevronDown size={12} className="text-slate-500" />
                                ) : (
                                  <ChevronUp size={12} className="text-slate-500 rotate-180" />
                                )}
                                <span className="text-xs text-slate-200 font-medium">
                                  {s.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {s.items.length} 条
                                </span>
                                {s.snapshots.length > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                                    {s.snapshots.length} 快照
                                  </span>
                                )}
                              </div>
                            </button>
                            <button
                              onClick={() => loadBatchSuite(s.id)}
                              className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 rounded text-[10px] text-white transition-all flex items-center gap-1"
                              title="载入此方案"
                            >
                              <ArrowRight size={10} />
                              载入
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`确定删除方案「${s.name}」？`)) {
                                  deleteBatchSuite(s.id);
                                }
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                              title="删除方案"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {expandedSuiteId === s.id && (
                            <div className="border-t border-slate-700/50 px-2.5 py-2 space-y-1.5 animate-fade-in">
                              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                <span>
                                  <Clock3 size={10} className="inline mr-0.5" />
                                  创建：{new Date(s.createdAt).toLocaleString()}
                                </span>
                                <span>更新：{new Date(s.updatedAt).toLocaleString()}</span>
                              </div>
                              {s.snapshots.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <div className="text-[10px] text-slate-400">历史运行快照：</div>
                                  {s.snapshots
                                    .slice()
                                    .reverse()
                                    .slice(0, 5)
                                    .map((snap) => (
                                      <div
                                        key={snap.id}
                                        className="flex items-center justify-between text-[10px] bg-slate-900/50 rounded px-2 py-1"
                                      >
                                        <span className="text-slate-500 font-mono">
                                          {new Date(snap.createdAt).toLocaleString()}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-emerald-400">
                                            ✓ {snap.passCount}
                                          </span>
                                          {snap.failCount > 0 && (
                                            <span className="text-rose-400">
                                              ✗ {snap.failCount}
                                            </span>
                                          )}
                                          {snap.errorCount > 0 && (
                                            <span className="text-amber-400">
                                              ! {snap.errorCount}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto -mx-5">
                <div className="inline-block min-w-full px-5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-700/50">
                        <th className="py-2 px-2 text-left font-medium">状态</th>
                        <th className="py-2 px-2 text-left font-medium">密钥</th>
                        <th className="py-2 px-2 text-left font-medium">位数</th>
                        <th className="py-2 px-2 text-left font-medium">周期</th>
                        <th className="py-2 px-2 text-left font-medium">算法</th>
                        <th className="py-2 px-2 text-left font-medium">测试时间</th>
                        <th className="py-2 px-2 text-left font-medium">预期</th>
                        <th className="py-2 px-2 text-left font-medium">实际</th>
                        <th className="py-2 px-2 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {batchTestItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-2">
                            {item.status === 'pending' && (
                              <span className="text-slate-500">待测试</span>
                            )}
                            {item.status === 'pass' && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Check size={14} />
                                通过
                              </span>
                            )}
                            {item.status === 'fail' && (
                              <span className="flex items-center gap-1 text-red-400">
                                <X size={14} />
                                失败
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="flex items-center gap-1 text-amber-400" title={item.errorMessage}>
                                <AlertCircle size={14} />
                                错误
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-300 max-w-[120px] truncate" title={item.secret}>
                            {item.secret.slice(0, 8)}...
                          </td>
                          <td className="py-2 px-2 text-slate-400">{item.digits}</td>
                          <td className="py-2 px-2 text-slate-400">{item.period}s</td>
                          <td className="py-2 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              item.algorithm === 'SHA-1'
                                ? 'bg-slate-700 text-slate-300'
                                : item.algorithm === 'SHA-256'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {item.algorithm}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-400 max-w-[100px] truncate" title={formatTimestamp(item.testTimestamp)}>
                            {item.testTimestamp ? (
                              <span className="font-mono">
                                {Math.floor(item.testTimestamp / 1000)}
                              </span>
                            ) : '当前'}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-300">
                            {item.expectedCode || '—'}
                          </td>
                          <td className="py-2 px-2">
                            {item.actualCode ? (
                              <span className={`font-mono ${
                                item.match
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              } flex items-center gap-1`}>
                                {item.actualCode}
                                <button
                                  onClick={() => handleCopyActualCode(item.actualCode!)}
                                  className="opacity-50 hover:opacity-100 transition-opacity"
                                  title="复制"
                                >
                                  <Copy size={10} />
                                </button>
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleApplyToMain(item)}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400 transition-all"
                                title="套用到主界面"
                              >
                                <ArrowRight size={12} />
                              </button>
                              <button
                                onClick={() => removeBatchTestItem(item.id)}
                                className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-all"
                                title="删除"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {pendingCount === 0 && batchTestItems.length > 0 && (
                <div
                  className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
                    failCount === 0 && errorCount === 0
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {failCount === 0 && errorCount === 0 ? (
                    <>
                      <Check size={16} />
                      全部 {batchTestItems.length} 条测试用例通过 ✓
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      {passCount}/{batchTestItems.length} 通过，
                      {failCount > 0 && ` ${failCount} 失败`}
                      {errorCount > 0 && ` ${errorCount} 错误`}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {batchTestItems.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Table size={32} className="mx-auto mb-2 opacity-30" />
              <p>导入测试用例后可在此批量运行回归测试</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
