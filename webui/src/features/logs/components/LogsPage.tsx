import { useMemo, useRef, useState } from 'react';
import { RefreshCw, Copy, Trash2, ChevronsDown, AlertCircle, FileText, Server, Terminal } from 'lucide-react';
import { useLogStream, type LogLine } from '@/features/logs/hooks/useLogStream';
import type { BoxStatus } from '@/types/box';

interface LogsPageProps {
  status: BoxStatus;
}

/** 行数可选项 */
const LINE_OPTIONS = [50, 100, 200, 500] as const;
/** 时间过滤可选项（小时，0 = 全部） */
const TIME_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '3h', value: 3 },
  { label: '1h', value: 1 },
  { label: '0.5h', value: 0.5 },
] as const;

/** 级别对应颜色 class */
function levelClass(level: LogLine['level']): string {
  switch (level) {
    case 'error': return 'text-rose-500 dark:text-rose-400';
    case 'warn':  return 'text-amber-500 dark:text-amber-400';
    case 'info':  return 'text-sky-500 dark:text-sky-400';
    case 'debug': return 'text-slate-400 dark:text-slate-500';
    default:      return 'text-slate-600 dark:text-slate-300';
  }
}

/** 过滤器 Pill 按钮 */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all
        ${active
          ? 'bg-indigo-500 text-white shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
    >
      {children}
    </button>
  );
}

export function LogsPage({ status }: LogsPageProps) {
  const [lineCount, setLineCount] = useState<number>(100);
  const [targetSource, setTargetSource] = useState<'auto' | 'core' | 'service'>('auto');
  const [timeFilter, setTimeFilter] = useState<number>(0); // 0 = 全部
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const { logLines, loading, error, logPath, refresh, clearLog } = useLogStream({
    lines: lineCount,
    target: targetSource,
    enabled: status.running,
  });

  // 根据时间过滤日志行（前端过滤，不删磁盘）
  const filteredLines = useMemo(() => {
    if (timeFilter === 0) return logLines;
    const cutoff = Date.now() - timeFilter * 60 * 60 * 1000;
    return logLines.filter((line) => {
      if (!line.timestamp) return true; // 无时间戳的行保留
      // 支持类似 +0s 的 singbox 时间戳直接保留
      if (line.timestamp.startsWith('+')) return true;
      const parsed = Date.parse(line.timestamp);
      return isNaN(parsed) || parsed >= cutoff;
    });
  }, [logLines, timeFilter]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    const el = logContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // 当 autoScroll 开启且日志更新时滚动
  useMemo(() => {
    if (autoScroll) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [filteredLines, autoScroll]);

  // 复制全部日志文本
  const handleCopy = async () => {
    const text = filteredLines.map((l) => l.raw).join('\n');
    await navigator.clipboard.writeText(text).catch(() => {});
  };

  // 清空日志（二次确认）
  const handleClear = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    await clearLog();
    setClearConfirm(false);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 工具栏 */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* 日志源选项 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-medium">
            <button
              onClick={() => setTargetSource('auto')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                targetSource === 'auto'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Terminal size={12} />
              智能综合
            </button>
            <button
              onClick={() => setTargetSource('core')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                targetSource === 'core'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Server size={12} />
              内核 ({status.bin_name || 'core'})
            </button>
            <button
              onClick={() => setTargetSource('service')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                targetSource === 'service'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <FileText size={12} />
              系统服务 (run.log)
            </button>
          </div>

          {/* 运行状态徽标 */}
          <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.running ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {status.running ? '实时' : '已停止'}
          </div>
        </div>

        {/* 行数 + 时间 筛选 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5">
            {LINE_OPTIONS.map((n) => (
              <Pill key={n} active={lineCount === n} onClick={() => setLineCount(n)}>
                {n} 行
              </Pill>
            ))}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 self-center mx-1 shrink-0" />
            {TIME_OPTIONS.map((opt) => (
              <Pill
                key={opt.value}
                active={timeFilter === opt.value}
                onClick={() => setTimeFilter(opt.value)}
              >
                {opt.label}
              </Pill>
            ))}
          </div>

          {/* 刷新按钮 */}
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 font-semibold disabled:opacity-60 active:scale-95 transition-all shrink-0 ml-1"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>

        {/* 自动滚动开关与当前日志文件路径 */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setAutoScroll((v) => !v)}
              className={`w-8 h-4 rounded-full relative transition-colors ${
                autoScroll ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                  autoScroll ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </div>
            自动滚动
          </label>
          {logPath && (
            <span className="truncate max-w-[220px] text-[10px] text-slate-400 dark:text-slate-500" title={logPath}>
              {logPath.replace('/data/adb/box/', '')}
            </span>
          )}
        </div>

        {/* 异常警示横条 */}
        {error && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <AlertCircle size={14} className="shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button
              onClick={() => void refresh()}
              className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[11px] shrink-0"
            >
              重试
            </button>
          </div>
        )}
      </div>

      {/* 日志内容区 */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto mx-3 rounded-xl bg-slate-950 dark:bg-slate-950 text-[11px] font-mono leading-relaxed px-3 py-2 min-h-0 scrollbar-hide border border-slate-800/60"
      >
        {filteredLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-8">
            <FileText size={28} className="text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-300">暂无日志内容</p>
            <p className="text-xs text-slate-500 max-w-xs text-center">
              {targetSource === 'core'
                ? `当前核心 (${status.bin_name || 'sing-box'}) 尚未产生新日志，可切换至系统服务查看启动事件。`
                : '日志文件暂无更多行记录，您可以点击右上角刷新。'}
            </p>
            {targetSource !== 'service' && (
              <button
                onClick={() => setTargetSource('service')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-semibold transition-all active:scale-95"
              >
                切换至系统服务日志 (run.log)
              </button>
            )}
          </div>
        ) : (
          filteredLines.map((line, i) => (
            <div key={i} className="flex gap-2 hover:bg-white/5 rounded px-1 py-0.5">
              {/* 时间戳 */}
              {line.timestamp && (
                <span className="text-slate-500 shrink-0 font-medium">{line.timestamp}</span>
              )}
              {/* 级别 */}
              <span className={`uppercase shrink-0 font-bold w-[38px] ${levelClass(line.level)}`}>
                {line.level === 'unknown' ? '' : line.level.slice(0, 4).toUpperCase()}
              </span>
              {/* 内容 */}
              <span className="text-slate-300 break-all">{line.content || line.raw}</span>
            </div>
          ))
        )}
      </div>

      {/* 滚动到底 + 操作栏 */}
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <button
          onClick={scrollToBottom}
          className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <ChevronsDown size={14} />
          到底部
        </button>
        <div className="flex items-center gap-2">
          {/* 复制 */}
          <button
            onClick={() => void handleCopy()}
            disabled={filteredLines.length === 0}
            className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Copy size={13} />
            复制
          </button>
          {/* 清空（二次确认） */}
          <button
            onClick={() => void handleClear()}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95
              ${clearConfirm
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-slate-100 dark:bg-slate-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'}`}
          >
            <Trash2 size={13} />
            {clearConfirm ? '确认清空' : '清空日志'}
          </button>
        </div>
      </div>
    </div>
  );
}
