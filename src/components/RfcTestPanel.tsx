import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from 'lucide-react';
import type { HashAlgorithm } from '@/utils/totp';
import {
  RFC_6238_TEST_VECTORS,
  RFC_TEST_SECRETS_BASE32,
  formatUnixTime,
  runRfcTests,
  type TestResult,
} from '@/utils/rfcTests';
import { useTotpStore } from '@/store/useTotpStore';

type AlgoFilter = 'ALL' | HashAlgorithm;

export function RfcTestPanel() {
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [algoFilter, setAlgoFilter] = useState<AlgoFilter>('ALL');
  const [copied, setCopied] = useState<string | null>(null);
  const { setSecret, setDigits, setAlgorithm, setCustomTime, resetTime, setPeriod, setTimeOffset } =
    useTotpStore();

  useEffect(() => {
    if (expanded && !results && !running) {
      runTests();
    }
  }, [expanded]);

  async function runTests() {
    setRunning(true);
    const res = await runRfcTests();
    setResults(res);
    setRunning(false);
  }

  const summary = useMemo(() => {
    if (!results) return null;
    const total = results.length;
    const passed = results.filter((r) => r.match).length;
    const failed = total - passed;
    const byAlgo: Record<string, { total: number; passed: number }> = {};
    for (const r of results) {
      if (!byAlgo[r.algorithm]) byAlgo[r.algorithm] = { total: 0, passed: 0 };
      byAlgo[r.algorithm].total++;
      if (r.match) byAlgo[r.algorithm].passed++;
    }
    return { total, passed, failed, byAlgo };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter((r) => algoFilter === 'ALL' || r.algorithm === algoFilter);
  }, [results, algoFilter]);

  async function handleJumpToVector(timeSec: number, algo: HashAlgorithm) {
    const targetTs = timeSec * 1000;
    setCustomTime(targetTs);
    setSecret(RFC_TEST_SECRETS_BASE32[algo]);
    setAlgorithm(algo);
    setDigits(8);
    setPeriod(30);
    setTimeOffset(0);
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="card-glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-700/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              summary
                ? summary.failed === 0
                  ? 'bg-emerald-500/20'
                  : 'bg-rose-500/20'
                : 'bg-indigo-500/20'
            }`}
          >
            <BookOpen
              size={18}
              className={
                summary
                  ? summary.failed === 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : 'text-indigo-400'
              }
            />
          </div>
          <div className="text-left">
            <div className="text-base font-semibold text-slate-100 flex items-center gap-2">
              RFC 6238 标准测试向量
              {summary && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    summary.failed === 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {summary.passed}/{summary.total} 通过
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              官方测试用例自检 · SHA-1 / SHA-256 / SHA-512
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-slate-400" />
        ) : (
          <ChevronDown size={20} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          {/* 操作栏 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runTests}
              disabled={running}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-xs text-white font-medium transition-all flex items-center gap-1.5"
            >
              {running ? (
                <FlaskConical size={13} className="animate-pulse" />
              ) : (
                <Play size={13} />
              )}
              {running ? '运行中...' : results ? '重新运行' : '运行测试'}
            </button>

            <div className="flex bg-slate-800/70 rounded-lg p-0.5 border border-slate-700 ml-1">
              {(['ALL', 'SHA-1', 'SHA-256', 'SHA-512'] as AlgoFilter[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAlgoFilter(a)}
                  className={`px-2.5 py-1 text-[11px] rounded-md font-mono transition-all ${
                    algoFilter === a
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {a === 'ALL' ? '全部' : a.replace('SHA-', 'SHA')}
                </button>
              ))}
            </div>

            {summary &&
              Object.entries(summary.byAlgo).map(([algo, s]) => (
                <div
                  key={algo}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md ${
                    s.passed === s.total
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-rose-900/30 text-rose-400'
                  }`}
                >
                  {algo.replace('SHA-', 'SHA')} {s.passed}/{s.total}
                </div>
              ))}
          </div>

          {/* 测试向量表 */}
          {results && filteredResults.length > 0 && (
            <div className="border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800/70 sticky top-0 z-10">
                    <tr className="text-slate-400">
                      <th className="text-left py-2 px-3 font-medium whitespace-nowrap">
                        时间 T(秒)
                      </th>
                      <th className="text-left py-2 px-3 font-medium whitespace-nowrap">
                        日期 (UTC)
                      </th>
                      <th className="text-left py-2 px-3 font-medium">算法</th>
                      <th className="text-left py-2 px-3 font-medium font-mono">
                        预期值
                      </th>
                      <th className="text-left py-2 px-3 font-medium font-mono">
                        实际值
                      </th>
                      <th className="text-center py-2 px-3 font-medium">
                        结果
                      </th>
                      <th className="text-center py-2 px-3 font-medium">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((r, idx) => {
                      const rowKey = `${r.algorithm}-${r.vector.time}-${idx}`;
                      return (
                        <tr
                          key={rowKey}
                          className={`border-t border-slate-700/50 hover:bg-slate-800/30 transition-all ${
                            !r.match ? 'bg-rose-900/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <code className="text-slate-300 font-mono text-[11px]">
                              {r.vector.time}
                            </code>
                            <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                              {r.vector.hexTime}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                            {formatUnixTime(r.vector.time).slice(0, 16)}
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              {r.vector.mode}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                r.algorithm === 'SHA-1'
                                  ? 'bg-slate-700 text-slate-300'
                                  : r.algorithm === 'SHA-256'
                                  ? 'bg-blue-900/40 text-blue-400'
                                  : 'bg-purple-900/40 text-purple-400'
                              }`}
                            >
                              {r.algorithm.replace('SHA-', 'SHA')}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <code className="font-mono text-emerald-400 font-semibold tracking-wider">
                                {r.expected}
                              </code>
                              <button
                                onClick={() =>
                                  handleCopy(r.expected, `exp-${rowKey}`)
                                }
                                className="text-slate-600 hover:text-slate-400"
                              >
                                {copied === `exp-${rowKey}` ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <code
                              className={`font-mono tracking-wider ${
                                r.match ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {r.actual}
                            </code>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {r.match ? (
                              <CheckCircle2
                                size={15}
                                className="text-emerald-400 inline"
                              />
                            ) : (
                              <XCircle size={15} className="text-rose-400 inline" />
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() =>
                                handleJumpToVector(r.vector.time, r.algorithm)
                              }
                              className="px-2 py-1 bg-cyan-900/30 hover:bg-cyan-900/60 text-cyan-400 rounded text-[10px] font-medium transition-all"
                              title="应用此配置到主界面"
                            >
                              套用
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 密钥说明 */}
          <div className="bg-slate-800/40 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <AlertCircle size={13} className="text-indigo-400" />
              RFC 标准测试密钥（Base32）
            </div>
            {(['SHA-1', 'SHA-256', 'SHA-512'] as HashAlgorithm[]).map((algo) => (
              <div
                key={algo}
                className="flex items-start gap-2 bg-slate-900/40 rounded-lg p-2"
              >
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                    algo === 'SHA-1'
                      ? 'bg-slate-700 text-slate-300'
                      : algo === 'SHA-256'
                      ? 'bg-blue-900/40 text-blue-400'
                      : 'bg-purple-900/40 text-purple-400'
                  }`}
                >
                  {algo.replace('SHA-', 'SHA')}
                </span>
                <code className="text-[10px] font-mono text-slate-400 break-all">
                  {RFC_TEST_SECRETS_BASE32[algo]}
                </code>
                <button
                  onClick={() =>
                    handleCopy(RFC_TEST_SECRETS_BASE32[algo], `sk-${algo}`)
                  }
                  className="flex-shrink-0 text-slate-500 hover:text-slate-300"
                >
                  {copied === `sk-${algo}` ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            ))}
          </div>

          {summary && summary.failed > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                有 {summary.failed} 个测试未通过，当前实现与 RFC 6238 标准存在差异，请检查算法实现。
              </span>
            </div>
          )}
          {summary && summary.failed === 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                太棒了！全部 {summary.total} 个测试向量通过，实现完全符合 RFC 6238 标准。
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
