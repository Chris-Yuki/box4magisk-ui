import { useState } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  FileText,
  Link2,
  Clock,
  HardDrive,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Modal, EmptyState } from '@/components/ui';
import { useSubscriptions } from '../hooks/useSubscriptions';

interface SubscriptionPageProps {
  binName: string;
  onBack?: () => void;
}

/** 格式化字节大小 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** 格式化日期为友好显示 */
function formatDate(iso: string): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export function SubscriptionPage({ binName, onBack }: SubscriptionPageProps) {
  const {
    subscriptions,
    loading,
    updatingName,
    isSupported,
    refresh,
    addSubscription,
    updateSubscription,
    removeSubscription,
  } = useSubscriptions(binName);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subName, setSubName] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 提交添加订阅
  const handleAddSubmit = async () => {
    if (!subName.trim() || !subUrl.trim()) return;
    setSubmitting(true);
    const success = await addSubscription(subName, subUrl);
    setSubmitting(false);
    if (success) {
      setSubName('');
      setSubUrl('');
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* 顶部标题与操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xs font-bold"
            >
              ← 返回设置
            </button>
          )}
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            订阅管理
          </h2>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all text-xs"
            title="刷新订阅列表"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {isSupported && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>添加订阅</span>
            </button>
          )}
        </div>
      </div>

      {/* 核心订阅机制提示 */}
      {!isSupported ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="flex items-center space-x-1.5 font-bold">
            <AlertCircle size={15} />
            <span>当前核心暂不支持自动下载订阅</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">
            {binName} 核心通常采用单体配置或外部转换工具管理节点。请直接使用【配置文件编辑】维护节点配置。
          </p>
        </div>
      ) : (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-3 text-xs text-indigo-800 dark:text-indigo-300 flex items-start space-x-2">
          <CheckCircle size={15} className="text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed opacity-90">
            已适配 <b>{binName}</b>：订阅添加后将自动下载并放置于模块指定目录，更新时直接重新拉取最新节点。
          </div>
        </div>
      )}

      {/* 订阅列表 */}
      {subscriptions.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icon={<FileText size={36} />}
            title="暂无已配置的外部订阅"
            description={
              isSupported
                ? "点击右上角「添加订阅」录入您的节点订阅链接"
                : "请直接编辑核心配置文件"
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const isUpdating = updatingName === sub.name;
            return (
              <div
                key={sub.name}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/80 transition-colors space-y-2.5"
              >
                {/* 订阅名称与操作 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      {sub.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {sub.name}
                      </div>
                    </div>
                  </div>

                  {/* 更新与删除按钮 */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => updateSubscription(sub.name)}
                      disabled={isUpdating}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all text-xs flex items-center gap-1 font-semibold"
                      title="立即更新订阅"
                    >
                      <RefreshCw size={13} className={isUpdating ? 'animate-spin text-indigo-500' : ''} />
                      <span className="hidden sm:inline">{isUpdating ? '更新中' : '更新'}</span>
                    </button>

                    <button
                      onClick={() => removeSubscription(sub.name)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all"
                      title="删除订阅"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 订阅链接预览 */}
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
                  <Link2 size={12} className="shrink-0 text-slate-400" />
                  <span className="truncate">{sub.url}</span>
                </div>

                {/* 元信息：大小与时间 */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center space-x-1">
                    <HardDrive size={11} />
                    <span>大小: {formatBytes(sub.size)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={11} />
                    <span>更新于: {formatDate(sub.last_updated)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加订阅 Modal */}
      <Modal
        isOpen={isAddModalOpen}
        title="添加代理订阅"
        onClose={() => setIsAddModalOpen(false)}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleAddSubmit}
              disabled={submitting || !subName.trim() || !subUrl.trim()}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting && <RefreshCw size={14} className="animate-spin" />}
              <span>{submitting ? '正在下载...' : '确认添加'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              订阅名称（仅英文字符或拼音，用于文件名）
            </label>
            <input
              type="text"
              placeholder="例如: provider_airport"
              value={subName}
              onChange={(e) => setSubName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-300 rounded-xl py-2 px-3 text-xs outline-none text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              订阅链接 URL
            </label>
            <textarea
              rows={3}
              placeholder="https://example.com/api/v1/client/subscribe?token=..."
              value={subUrl}
              onChange={(e) => setSubUrl(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-300 rounded-xl py-2 px-3 text-xs outline-none text-slate-900 dark:text-slate-100 resize-none font-mono"
            />
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            💡 提示：点击确认后，系统将使用模块环境的 curl 自动拉取订阅内容并持久化保存。
          </p>
        </div>
      </Modal>
    </div>
  );
}
