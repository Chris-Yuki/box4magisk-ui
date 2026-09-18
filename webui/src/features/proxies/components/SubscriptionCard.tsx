import { useState } from 'react';
import { RefreshCw, Globe, Trash2, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SubscriptionItem } from '@/types/box';

interface SubscriptionCardProps {
  subscription: SubscriptionItem;
  isUpdating: boolean;
  onUpdate: (sub: SubscriptionItem) => Promise<void>;
  onEdit: (sub: SubscriptionItem) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({ subscription, isUpdating, onUpdate, onEdit, onDelete }: SubscriptionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatTime = (ts?: number) => {
    if (!ts) return '未更新';
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Globe size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{subscription.name}</h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {subscription.type || 'auto'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
              {subscription.url}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onEdit(subscription)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="编辑"
          >
            <Edit3 size={15} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center space-x-1 animate-in fade-in">
              <button
                onClick={() => onDelete(subscription.id)}
                className="px-2 py-1 rounded bg-rose-500 text-white text-xs font-bold active:scale-95"
              >
                确定
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
              title="删除"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          {subscription.nodeCount !== undefined ? (
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={13} className="mr-1" />
              {subscription.nodeCount} 个节点
            </span>
          ) : (
            <span className="flex items-center text-slate-400">
              <AlertCircle size={13} className="mr-1" />
              暂无节点
            </span>
          )}
          <span>•</span>
          <span>{formatTime(subscription.updatedAt)}</span>
        </div>

        <button
          onClick={() => void onUpdate(subscription)}
          disabled={isUpdating}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
          <span>{isUpdating ? '拉取中...' : '立即拉取'}</span>
        </button>
      </div>
    </div>
  );
}
