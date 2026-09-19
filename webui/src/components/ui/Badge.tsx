// Badge - 状态标签组件
// 用于显示状态、类型等小标签，支持 5 种语义颜色

import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

// 各变体的颜色配置
const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  success: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-100  dark:bg-amber-500/15  text-amber-700  dark:text-amber-400',
  error:   'bg-red-100    dark:bg-red-500/15    text-red-700    dark:text-red-400',
  info:    'bg-blue-100   dark:bg-blue-500/15   text-blue-700   dark:text-blue-400',
  default: 'bg-slate-100  dark:bg-slate-700     text-slate-600  dark:text-slate-300',
};

// 尺寸配置
const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-[10px] font-semibold px-1.5 py-0.5',
  md: 'text-xs font-semibold px-2 py-0.5',
};

export function Badge({ variant = 'default', size = 'md', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full',
        'transition-colors duration-200',
        variantStyles[variant],
        sizeStyles[size],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
