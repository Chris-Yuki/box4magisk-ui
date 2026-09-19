// InputRow - 带标签的文本输入行，行高约 52px
// 输入框：rounded-xl，focus 时 ring-indigo-300

import { ensureFieldVisible } from '@/lib/focus';

interface InputRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function InputRow({ label, value, onChange }: InputRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 transition-all duration-200">
      {/* 左侧标签 */}
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">
        {label}
      </span>

      {/* 输入框：等宽字体，右对齐文字，rounded-xl */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => ensureFieldVisible(e.currentTarget)}
        className={[
          'w-36 text-sm font-mono text-right',
          'bg-slate-100 dark:bg-slate-800',
          'hover:bg-slate-200/80 dark:hover:bg-slate-700',
          'text-slate-800 dark:text-slate-200',
          'border border-slate-200 dark:border-slate-700',
          'rounded-xl px-3 py-2',
          'outline-none transition-all duration-200 shadow-sm',
          'focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500/40',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
        ].join(' ')}
      />
    </div>
  );
}
