// NavItem - 底部导航栏单项
// 激活时：图标/标签变 indigo 色，顶部显示 2px 渐变指示条
// 未激活：text-slate-400，整体 transition-all duration-200

import React from 'react';

interface NavItemProps {
  icon: React.ReactElement<any>;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center w-20 h-12 transition-all duration-200 active:scale-95"
    >
      {/* 顶部激活指示条：渐变 indigo→violet，滑入动画 */}
      <div
        className={[
          'absolute top-0 w-8 h-[2px] rounded-b-full',
          'bg-gradient-to-r from-indigo-500 to-violet-500',
          'transition-all duration-200',
          active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50',
        ].join(' ')}
      />

      {/* 图标区域：激活 indigo，未激活 slate */}
      <div
        className={[
          'transition-all duration-200',
          active
            ? 'text-indigo-500 dark:text-indigo-400'
            : 'text-slate-400 dark:text-slate-500',
        ].join(' ')}
      >
        {React.cloneElement(icon, { strokeWidth: active ? 2.5 : 2 })}
      </div>

      {/* 标签文字：激活加粗，未激活常规 */}
      <span
        className={[
          'text-[11px] mt-0.5 transition-all duration-200',
          active
            ? 'font-bold text-indigo-500 dark:text-indigo-400'
            : 'font-medium text-slate-400 dark:text-slate-500',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  );
}
