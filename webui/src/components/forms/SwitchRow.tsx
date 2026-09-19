// SwitchRow - 带标签、副标题、图标的开关行
// 行高约 52px（py-3.5 px-4），左侧圆形图标背景

import type React from 'react';
import { Switch } from './Switch';

interface SwitchRowProps {
  label: string;
  sub?: string;          // 副标题（小字灰色）
  icon?: React.ReactNode; // 左侧图标
  checked: boolean;
  onChange: (next: boolean) => void;
  border?: boolean;      // 是否显示底部分割线
}

export function SwitchRow({ label, sub, icon, checked, onChange, border = true }: SwitchRowProps) {
  return (
    <div
      className={[
        'flex items-center justify-between py-3.5 px-4 transition-all duration-200',
        border ? 'border-b border-slate-100 dark:border-slate-800/50' : '',
      ].join(' ')}
    >
      {/* 左侧：图标 + 文字 */}
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          // 圆形图标背景 36x36，indigo 淡色
          <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 transition-colors">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {/* 主标签：加粗 */}
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors leading-snug">
            {label}
          </div>
          {/* 副标题：小字灰色 */}
          {sub && (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight transition-colors truncate">
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* 右侧 Switch */}
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
