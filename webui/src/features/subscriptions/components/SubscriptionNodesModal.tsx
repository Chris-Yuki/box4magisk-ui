import { useState, useMemo } from 'react';
import {
  Search,
  Server,
  Layers,
  Copy,
  Check,
  Globe,
} from 'lucide-react';
import { Modal } from '@/components/ui';
import type { ParsedSubscription } from '../lib/subscriptionParser';
import { notify } from '@/lib/bridge';

interface SubscriptionNodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  subName: string;
  parsedData: ParsedSubscription | null;
  loading: boolean;
  error?: string | null;
}

/** 根据代理协议获取色彩风格 */
function getProtocolBadgeClass(type: string) {
  const p = type.toLowerCase();
  if (p.includes('vless')) return 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/20';
  if (p.includes('vmess')) return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
  if (p.includes('trojan')) return 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
  if (p.includes('tuic')) return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
  if (p.includes('hysteria') || p.includes('hy2')) return 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20';
  if (p.includes('ss') || p.includes('shadowsocks')) return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20';
  if (p.includes('wireguard')) return 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
}

export function SubscriptionNodesModal({
  isOpen,
  onClose,
  subName,
  parsedData,
  loading,
  error,
}: SubscriptionNodesModalProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'groups' | 'raw'>('nodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // 节点过滤筛选
  const filteredNodes = useMemo(() => {
    if (!parsedData?.nodes) return [];
    if (!searchQuery.trim()) return parsedData.nodes;
    const q = searchQuery.toLowerCase().trim();
    return parsedData.nodes.filter(
      n =>
        n.name.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.server && n.server.toLowerCase().includes(q))
    );
  }, [parsedData?.nodes, searchQuery]);

  // 策略组过滤筛选
  const filteredGroups = useMemo(() => {
    if (!parsedData?.groups) return [];
    if (!searchQuery.trim()) return parsedData.groups;
    const q = searchQuery.toLowerCase().trim();
    return parsedData.groups.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.type.toLowerCase().includes(q)
    );
  }, [parsedData?.groups, searchQuery]);

  const handleCopyRaw = async () => {
    if (!parsedData?.rawText) return;
    try {
      await navigator.clipboard.writeText(parsedData.rawText);
      setCopied(true);
      notify('配置内容已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('复制失败，请手动选择复制');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`订阅节点 · ${subName}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {parsedData ? (
              <span>
                共 {parsedData.nodes.length} 个节点
                {parsedData.groups.length > 0 && ` · ${parsedData.groups.length} 个分流组`}
              </span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >
            关闭
          </button>
        </div>
      }
    >
      <div className="space-y-3.5 max-h-[72vh] flex flex-col">
        {/* 加载状态 */}
        {loading && (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-500 border-t-transparent" />
            <div>正在加载并解析订阅节点...</div>
          </div>
        )}

        {/* 错误提示 */}
        {!loading && error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* 正常内容展示 */}
        {!loading && !error && parsedData && (
          <>
            {/* 统计横幅与格式 Badge */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Server size={14} className="text-indigo-500" />
                  <span>{parsedData.nodes.length} 个节点</span>
                </div>
                {parsedData.groups.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
                    <Layers size={14} className="text-purple-500" />
                    <span>{parsedData.groups.length} 个策略组</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  {parsedData.format}
                </span>
              </div>
            </div>

            {/* 标签页与搜索栏 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('nodes')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'nodes'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  节点 ({parsedData.nodes.length})
                </button>
                {parsedData.groups.length > 0 && (
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeTab === 'groups'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    分组 ({parsedData.groups.length})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'raw'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  源码
                </button>
              </div>

              {activeTab !== 'raw' && (
                <div className="relative flex-1 min-w-0">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索节点或协议..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              )}
            </div>

            {/* 标签内容展示区 */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[50vh] scrollbar-thin">
              {/* Tab 1: 节点列表 */}
              {activeTab === 'nodes' && (
                <>
                  {filteredNodes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                      {searchQuery ? '没有找到符合条件的节点' : '该订阅中未包含任何独立代理节点'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredNodes.map((node, idx) => {
                        const badgeStyle = getProtocolBadgeClass(node.type);
                        return (
                          <div
                            key={node.name + idx}
                            className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide border ${badgeStyle}`}
                                >
                                  {node.type}
                                </span>
                                <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                  {node.name}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                {node.server && (
                                  <span className="flex items-center space-x-1 truncate">
                                    <Globe size={11} className="shrink-0 opacity-70" />
                                    <span>
                                      {node.server}
                                      {node.port ? `:${node.port}` : ''}
                                    </span>
                                  </span>
                                )}
                                {node.details && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                    {node.details}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Tab 2: 策略分组 */}
              {activeTab === 'groups' && (
                <>
                  {filteredGroups.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                      {searchQuery ? '没有找到符合条件的分组' : '未包含分流策略分组'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredGroups.map((group, idx) => (
                        <div
                          key={group.name + idx}
                          className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Layers size={13} className="text-purple-500" />
                              <div className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                {group.name}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                              {group.type}
                            </span>
                          </div>

                          {group.proxies && group.proxies.length > 0 && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              包含 {group.proxies.length} 个子出站: {group.proxies.slice(0, 3).join(', ')}
                              {group.proxies.length > 3 ? ' 等' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Tab 3: 原始配置文本 */}
              {activeTab === 'raw' && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-slate-400 font-mono">
                      文件大小: {parsedData.rawText.length} 字符
                    </span>
                    <button
                      onClick={handleCopyRaw}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold active:scale-95 transition-all"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? '已复制' : '复制全文'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed max-h-[42vh] border border-slate-800 select-text">
                    {parsedData.rawText}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
