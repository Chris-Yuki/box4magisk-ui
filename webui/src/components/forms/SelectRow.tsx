// SelectRow - 带标签的下拉选择行，行高约 52px

import { Select } from './Select';

type SelectOption = string | { l: string; v: string };

interface SelectRowProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  border?: boolean;
}

export function SelectRow({ label, value, options, onChange, border = false }: SelectRowProps) {
  return (
    <div
      className={[
        'flex items-center justify-between py-3.5 px-4 transition-all duration-200',
        border ? 'border-b border-slate-100 dark:border-slate-800/50' : '',
      ].join(' ')}
    >
      {/* 左侧标签 */}
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors">
        {label}
      </span>
      {/* 右侧下拉 */}
      <Select value={value} options={options} onChange={onChange} />
    </div>
  );
}
