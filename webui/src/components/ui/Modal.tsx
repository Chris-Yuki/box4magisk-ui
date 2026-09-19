// Modal - 底部抽屉弹窗（Sheet）
// 从底部滑入，带遮罩、拖拽指示器、可选 footer

import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode; // 底部操作按钮区（可选）
}

export function Modal({ isOpen, title, onClose, children, footer }: ModalProps) {
  // 弹窗打开时禁止 body 滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // 全屏遮罩层
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200" />

      {/* 底部抽屉面板 */}
      <div
        className={[
          'relative w-full max-w-lg',
          'bg-white dark:bg-slate-900',
          'rounded-t-3xl shadow-2xl',
          'animate-in slide-in-from-bottom duration-300',
          'pb-safe',
        ].join(' ')}
        onClick={e => e.stopPropagation()} // 阻止点击面板时关闭
      >
        {/* 顶部拖拽指示器 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
            aria-label="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="px-5 py-4 overflow-y-auto max-h-[60vh] scrollbar-hide">
          {children}
        </div>

        {/* 底部操作区（可选）*/}
        {footer && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
