// EmptyState - 空状态占位组件
// 居中展示，大图标 + 加粗标题 + 灰色描述 + 可选操作按钮

import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;     // 大图标（建议 32-48px）
  title: string;              // 主标题
  description?: string;       // 描述文字
  action?: React.ReactNode;   // 可选操作按钮（如"新建"、"刷新"）
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* 图标区域：带淡色圆形背景 */}
      {icon && (
        <div className="mb-4 w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors">
          {icon}
        </div>
      )}

      {/* 主标题 */}
      <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 transition-colors">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed transition-colors">
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  );
}
