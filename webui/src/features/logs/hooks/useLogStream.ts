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

  // 提取时间戳
  let rest = trimmed;
  let timestamp: string | null = null;
  const tsMatch = TS_RE.exec(rest);
  if (tsMatch) {
    timestamp = tsMatch[1];
    rest = rest.slice(tsMatch[0].length);
  }

  // 检测日志级别关键字（大小写不敏感）
  const upper = rest.toUpperCase();
  let level: LogLine['level'] = 'unknown';
  if (/\[?ERROR\]?/.test(upper)) level = 'error';
  else if (/\[?WARN(?:ING)?\]?/.test(upper)) level = 'warn';
  else if (/\[?INFO\]?/.test(upper)) level = 'info';
  else if (/\[?DEBUG\]?/.test(upper)) level = 'debug';

  // 去除级别前缀，如 [Info]、[ERROR] 等
  const content = rest.replace(/^\[?(ERROR|WARN(?:ING)?|INFO|DEBUG)\]?\s*/i, '').trim();

  return { raw, level, timestamp, content };
}

/** 日志流 Hook：每 3 秒轮询一次，返回解析好的日志行列表 */
export function useLogStream({ lines, enabled }: UseLogStreamOptions) {
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await boxBridge.checkLog(lines);
      const raw: string = typeof result === 'string'
        ? result
        : (result as any)?.content ?? '';
      const parsed = raw
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .map(parseLine);
      setLogLines(parsed);
    } catch {
      // 获取失败时保留上次内容，不重置
    } finally {
      setLoading(false);
    }
  }, [lines]);

  // 定时轮询
  useEffect(() => {
    if (!enabled) {
      setLogLines([]);
      return;
    }

    void fetchLogs();
    timerRef.current = setInterval(() => void fetchLogs(), 3000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, fetchLogs]);

  /** 清空磁盘日志并刷新 */
  const clearLog = useCallback(async () => {
    await boxBridge.clearLog();
    setLogLines([]);
  }, []);

  return { logLines, loading, refresh: fetchLogs, clearLog };
}
