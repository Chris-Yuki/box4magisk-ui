import { useCallback, useEffect, useRef, useState } from 'react';
import { boxBridge } from '@/lib/bridge';

/** 单条解析后的日志行 */
export interface LogLine {
  raw: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'unknown';
  /** 从日志内容中提取的时间戳字符串，无法解析则为 null */
  timestamp: string | null;
  /** 去除时间戳和级别前缀后的正文 */
  content: string;
}

interface UseLogStreamOptions {
  /** 拉取最近几行日志 */
  lines: number;
  /** 日志源：auto=智能匹配，core=核心进程，service=模块服务 */
  target?: 'auto' | 'core' | 'service';
  /** false 时暂停轮询（如服务未运行） */
  enabled: boolean;
}

// 常见日志格式的时间戳匹配，支持 yyyy-MM-dd HH:mm:ss / [HH:mm:ss] 等
const TS_RE =
  /^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\d{2}:\d{2}:\d{2}|\[\d{2}:\d{2}:\d{2}\])\s*/;

function parseLine(raw: string): LogLine {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw, level: 'unknown', timestamp: null, content: '' };
  }

  let rest = trimmed;
  let timestamp: string | null = null;
  let level: LogLine['level'] = 'unknown';

  // 1. 标准时间戳 yyyy-MM-dd HH:mm:ss 或 [HH:mm:ss]
  const tsMatch = TS_RE.exec(rest);
  if (tsMatch) {
    timestamp = tsMatch[1];
    rest = rest.slice(tsMatch[0].length).trim();
  }

  // 2. 检测 logrus/sing-box 格式，如 WARN[0000] 或 INFO[0012]
  const logrusMatch = /^(FATAL|ERROR|WARN(?:ING)?|INFO|DEBUG)\[(\d+)\]\s*/i.exec(rest);
  if (logrusMatch) {
    const lvl = logrusMatch[1].toUpperCase();
    if (lvl.startsWith('ERR') || lvl === 'FATAL') level = 'error';
    else if (lvl.startsWith('WARN')) level = 'warn';
    else if (lvl.startsWith('INFO')) level = 'info';
    else if (lvl.startsWith('DEBUG')) level = 'debug';
    timestamp = timestamp || `+${logrusMatch[2]}s`;
    rest = rest.slice(logrusMatch[0].length).trim();
  } else {
    // 通用日志级别关键字检测
    const upper = rest.toUpperCase();
    if (/^\[?ERROR\]?/.test(upper)) level = 'error';
    else if (/^\[?WARN(?:ING)?\]?/.test(upper)) level = 'warn';
    else if (/^\[?INFO\]?/.test(upper)) level = 'info';
    else if (/^\[?DEBUG\]?/.test(upper)) level = 'debug';

    rest = rest.replace(/^\[?(ERROR|WARN(?:ING)?|INFO|DEBUG)\]?:?\s*/i, '').trim();
  }

  return { raw, level, timestamp, content: rest || raw };
}

/** 日志流 Hook：每 3 秒轮询一次，返回解析好的日志行列表 */
export function useLogStream({ lines, target = 'auto', enabled }: UseLogStreamOptions) {
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string>('');
  const [logExists, setLogExists] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await boxBridge.checkLog(lines, target);
      const raw: string = typeof result === 'string'
        ? result
        : (result as any)?.content ?? '';
      const path: string = (result as any)?.path ?? '';
      const exists: boolean = (result as any)?.exists ?? true;

      setLogPath(path);
      setLogExists(exists);

      const parsed = raw
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .map(parseLine);
      setLogLines(parsed);
      setError(null);
    } catch (err: any) {
      console.error('[useLogStream] fetchLogs error:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [lines, target]);

  // 挂载及参数变化时获取日志；服务运行时开启定时轮询
  useEffect(() => {
    void fetchLogs();

    if (enabled) {
      timerRef.current = setInterval(() => void fetchLogs(), 3000);
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, fetchLogs]);

  /** 清空磁盘日志并刷新 */
  const clearLog = useCallback(async () => {
    try {
      await boxBridge.clearLog();
      setLogLines([]);
      setError(null);
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  }, []);

  return {
    logLines,
    loading,
    error,
    logPath,
    logExists,
    refresh: fetchLogs,
    clearLog,
  };
}
