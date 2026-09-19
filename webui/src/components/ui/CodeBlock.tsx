// CodeBlock - 日志/配置文本展示组件
// 等宽字体，深色背景，支持按行高亮（ERROR/WARN/INFO）

import { useEffect, useRef } from 'react';

export interface CodeBlockProps {
  content: string;         // 要展示的文本（多行）
  maxHeight?: string;      // 最大高度，默认 '100%'
  autoScroll?: boolean;    // 是否自动滚到最新内容（适合实时日志）
  highlightRules?: Array<{
    pattern: RegExp;       // 匹配规则
    className: string;     // 高亮 CSS 类名
  }>;
}

// 内置默认高亮规则
const DEFAULT_HIGHLIGHT_RULES: CodeBlockProps['highlightRules'] = [
  { pattern: /\b(ERROR|FATAL|FAIL|error|fatal)\b/,  className: 'text-red-400' },
  { pattern: /\b(WARN|WARNING|warn|warning)\b/,      className: 'text-amber-400' },
  { pattern: /\b(INFO|info)\b/,                      className: 'text-blue-400' },
  { pattern: /\b(SUCCESS|OK|DONE|success|ok|done)\b/, className: 'text-emerald-400' },
];

/**
 * 根据高亮规则，判断一行文字应用哪个颜色类
 * 只取第一个匹配到的规则
 */
function getLineClass(
  line: string,
  rules: NonNullable<CodeBlockProps['highlightRules']>
): string {
  for (const rule of rules) {
    if (rule.pattern.test(line)) return rule.className;
  }
  return 'text-slate-300'; // 默认颜色
}

export function CodeBlock({
  content,
  maxHeight = '100%',
  autoScroll = false,
  highlightRules,
}: CodeBlockProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // 若未提供高亮规则，使用内置默认规则（强制断言为非空）
  const rules: NonNullable<CodeBlockProps['highlightRules']> = highlightRules ?? DEFAULT_HIGHLIGHT_RULES!;
  const lines = content.split('\n');

  // 当内容更新且 autoScroll=true 时，自动滚到底部
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, autoScroll]);

  return (
    // 深色容器：bg-slate-950，等宽字体
    <div
      className="w-full overflow-auto rounded-xl bg-slate-950 scrollbar-hide"
      style={{ maxHeight }}
    >
      <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap break-words">
        {lines.map((line, i) => (
          <span key={i} className={`block ${getLineClass(line, rules)}`}>
            {/* 保留空行高度 */}
            {line || '\u00A0'}
          </span>
        ))}
        {/* 自动滚动锚点 */}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
