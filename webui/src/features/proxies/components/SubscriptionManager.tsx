import { useEffect, useState } from 'react';
import { Plus, Sparkles, Inbox, RefreshCw } from 'lucide-react';
import { boxBridge, notify } from '@/lib/bridge';
import { processSubscriptionUpdate } from '@/lib/subscription';
import { SubscriptionCard } from './SubscriptionCard';
import { SubscriptionModal } from './SubscriptionModal';
import type { SubscriptionItem } from '@/types/box';

interface SubscriptionManagerProps {
  onRefreshProxies?: () => Promise<void>;
}

export function SubscriptionManager({ onRefreshProxies }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);

  const loadSubscriptions = async () => {
    try {
      const list = await boxBridge.subscriptionList();
      setSubscriptions(Array.isArray(list) ? list : []);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  const handleSaveSubscription = async (data: Omit<SubscriptionItem, 'nodeCount' | 'updatedAt'>) => {
    let nextList: SubscriptionItem[];
    const exists = subscriptions.some((s) => s.id === data.id);
    if (exists) {
      nextList = subscriptions.map((s) => (s.id === data.id ? { ...s, ...data } : s));
    } else {
      nextList = [...subscriptions, { ...data, updatedAt: undefined, nodeCount: undefined }];
    }
    setSubscriptions(nextList);
    await boxBridge.subscriptionSave(nextList);
    notify('订阅已保存');
  };

  const handleDeleteSubscription = async (id: string) => {
    const nextList = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(nextList);
    await boxBridge.subscriptionSave(nextList);
    notify('订阅已删除');
  };

  const handleUpdate = async (sub: SubscriptionItem) => {
    setUpdatingId(sub.id);
    try {
      const { nodeCount } = await processSubscriptionUpdate(sub);
      const now = Date.now();
      const nextList = subscriptions.map((s) => (s.id === sub.id ? { ...s, nodeCount, updatedAt: now } : s));
      setSubscriptions(nextList);
      await boxBridge.subscriptionSave(nextList);
      notify(`订阅更新成功！已同步 ${nodeCount} 个节点并重启核心`);
      if (onRefreshProxies) {
        await onRefreshProxies();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      notify(`更新失败: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw size={24} className="animate-spin text-indigo-500 mb-3" />
        <p className="text-xs">加载订阅配置中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Sparkles size={16} className="text-indigo-500" />
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            订阅配置源 ({subscriptions.length})
          </h3>
        </div>
        <button
          onClick={() => {
            setEditingSub(null);
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center space-x-1.5 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>添加订阅</span>
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center justify-center text-slate-400 space-y-3">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-full text-slate-400">
            <Inbox size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">暂无任何订阅</p>
            <p className="text-xs text-slate-400 mt-1">点击右上角“添加订阅”直接导入机场或节点链接</p>
          </div>
          <button
            onClick={() => {
              setEditingSub(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl active:scale-95 transition-all"
          >
            立即添加第一个订阅
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              isUpdating={updatingId === sub.id}
              onUpdate={handleUpdate}
              onEdit={(s) => {
                setEditingSub(s);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteSubscription}
            />
          ))}
        </div>
      )}

      <SubscriptionModal
        isOpen={isModalOpen}
        initialData={editingSub}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSub(null);
        }}
        onSave={handleSaveSubscription}
      />
    </div>
  );
}
