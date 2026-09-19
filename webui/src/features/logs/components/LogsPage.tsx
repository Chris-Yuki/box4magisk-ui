import { useMemo, useRef, useState } from 'react';
import { RefreshCw, Copy, Trash2, ChevronsDown } from 'lucide-react';
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
  const [timeFilter, setTimeFilter] = useState<number>(0); // 0 = 全部
  const [autoScroll, setAutoScroll] = useState(true);
  const [clearConfirm, setClearConfirm] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const { logLines, loading, refresh, clearLog } = useLogStream({
    lines: lineCount,
    enabled: status.running,
  });

  // 根据时间过滤日志行（前端过滤，不删磁盘）
  const filteredLines = useMemo(() => {
    if (timeFilter === 0) return logLines;
    const cutoff = Date.now() - timeFilter * 60 * 60 * 1000;
    return logLines.filter((line) => {
      if (!line.timestamp) return true; // 无时间戳的行保留
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
      // 延迟一帧确保 DOM 已更新
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

  // 服务未运行时展示空状态
  if (!status.running) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center animate-in fade-in duration-200">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">服务未运行</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">启动 Box 后即可查看实时日志</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 工具栏 */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* 行数 + 时间 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {LINE_OPTIONS.map((n) => (
            <Pill key={n} active={lineCount === n} onClick={() => setLineCount(n)}>
              {n} 行
            </Pill>
          ))}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 self-center mx-1 shrink-0" />
          {TIME_OPTIONS.map((opt) => (
            <Pill key={opt.value} active={timeFilter === opt.value} onClick={() => setTimeFilter(opt.value)}>
              {opt.label}
            </Pill>
          ))}
        </div>
        {/* 自动滚动 + 刷新 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
            <div
              onClick={() => setAutoScroll((v) => !v)}
              className={`w-8 h-4 rounded-full relative transition-colors
                ${autoScroll ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all
                ${autoScroll ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            自动滚动
          </label>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 font-semibold disabled:opacity-60 active:scale-95 transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* 日志内容区 */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto mx-3 rounded-xl bg-slate-950 dark:bg-slate-950 text-[11px] font-mono leading-relaxed px-3 py-2 min-h-0 scrollbar-hide"
      >
        {filteredLines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">暂无日志</div>
        ) : (
          filteredLines.map((line, i) => (
            <div key={i} className="flex gap-2 hover:bg-white/5 rounded px-1 py-0.5">
              {/* 时间戳 */}
              {line.timestamp && (
                <span className="text-slate-600 shrink-0">{line.timestamp}</span>
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
            className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
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
