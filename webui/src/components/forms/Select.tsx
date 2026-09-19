// Select 下拉选择组件 - NaiveUI 风格
// 自定义下拉列表，支持 {l: 显示名, v: 值} 或纯字符串选项

import { useState } from 'react';
import { Check } from 'lucide-react';

// 选项类型：纯字符串 或 {l: 显示名, v: 值}
type SelectOption = string | { l: string; v: string };

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function Select({ value, options, onChange, className = 'w-36', disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 找到当前选中项的显示文字
  const currentOption = options.find(o => (typeof o === 'object' ? o.v : o) === value) || value;
  const displayLabel = typeof currentOption === 'object' ? currentOption.l : currentOption;

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        disabled={disabled}
        className={[
          className,
          'flex items-center justify-between gap-2',
          'bg-slate-100 dark:bg-slate-800',
          'hover:bg-slate-200/80 dark:hover:bg-slate-700',
          'text-slate-700 dark:text-slate-200 text-sm font-semibold',
          'rounded-xl pl-3 pr-2.5 py-2',
          'border border-slate-200 dark:border-slate-700',
          'outline-none transition-all duration-200 shadow-sm',
          'focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500/40',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        ].join(' ')}
      >
        <span className="truncate">{displayLabel}</span>
        {/* 箭头图标，打开时旋转 180° */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14" height="14"
          viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 点击外部关闭遮罩 */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* 下拉列表 */}
          <div className="absolute right-0 mt-1.5 w-max min-w-[140px] z-50 overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-150">
            {options.map((option, index) => {
              const label = typeof option === 'object' ? option.l : option;
              const optionValue = typeof option === 'object' ? option.v : option;
              const isSelected = optionValue === value;

              return (
                <button
                  key={optionValue}
                  disabled={disabled}
                  onClick={() => { onChange(optionValue); setIsOpen(false); }}
                  className={[
                    'w-full text-left px-4 py-2.5 text-sm font-semibold',
                    'flex items-center justify-between gap-4',
                    'transition-colors duration-150',
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                    index !== options.length - 1
                      ? 'border-b border-slate-50 dark:border-slate-700/50'
                      : '',
                  ].join(' ')}
                >
                  <span className="truncate">{label}</span>
                  {/* 选中打勾 */}
                  {isSelected && <Check size={15} strokeWidth={3} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
