import { useCallback, useMemo } from 'react';
import { Activity, RefreshCw, Server, ServerOff, ZapOff, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ProxyGroupCard } from '@/features/proxies/components/ProxyGroupCard';
import { ProxyProviderCard } from '@/features/proxies/components/ProxyProviderCard';
import { SubscriptionManager } from '@/features/proxies/components/SubscriptionManager';
import { useProxyData } from '@/features/proxies/hooks/useProxyData';
import { useProxyPrefs } from '@/features/proxies/hooks/useProxyPrefs';
import { type NodeSortType, type TabProxiesProps } from '@/features/proxies/types';

const GROUP_TYPES = ['Selector', 'URLTest', 'Fallback', 'LoadBalance'];

export function TabProxies({ status }: TabProxiesProps) {
  const {
    viewType,
    setViewType,
    expanded,
    setExpanded,
    expandedProviders,
    setExpandedProviders,
    groupSorts,
    setGroupSorts,
  } = useProxyPrefs();

  const {
    proxies,
    providers,
    latencies,
    loading,
    apiError,
    testingOwners,
    testingNodes,
    updatingProvider,
    fetchInitialData,
    handleSelectNode,
    handleUpdateProvider,
    handleTestProvider,
    handleTestGroup,
  } = useProxyData(status);

  const toggleExpand = useCallback((groupName: string) => {
    setExpanded(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  }, [setExpanded]);

  const toggleProviderExpand = useCallback((name: string) => {
    setExpandedProviders(prev => ({ ...prev, [name]: !prev[name] }));
  }, [setExpandedProviders]);

  const toggleGroupSort = useCallback((e: React.MouseEvent, groupName: string) => {
    e.stopPropagation();
    const orders: NodeSortType[] = ['default', 'latency', 'name'];
    setGroupSorts(prev => {
      const current = prev[groupName] || 'default';
      const next = orders[(orders.indexOf(current) + 1) % orders.length];
      return { ...prev, [groupName]: next };
    });
  }, [setGroupSorts]);

  const proxyGroups = useMemo(() => {
    if (!proxies) return [];
    const globalOrder = proxies.GLOBAL?.all || [];
    return Object.keys(proxies)
      .filter(name => GROUP_TYPES.includes(proxies[name].type))
      .sort((a, b) => {
        let idxA = globalOrder.indexOf(a);
        let idxB = globalOrder.indexOf(b);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
      });
  }, [proxies]);

  const providerList = useMemo(() => {
    return Object.entries(providers || {}).filter(([, provider]) => provider.vehicleType !== 'Compatible');
  }, [providers]);

  return (
    <div className="px-4 pb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl mb-4">
        <button
          onClick={() => setViewType('proxies')}
          className={cn(
            'flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center space-x-1.5',
            viewType === 'proxies' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          <span>代理组</span>
          {proxyGroups.length > 0 && (
            <span className={cn('px-1.5 py-0.5 rounded-md text-[10px]', viewType === 'proxies' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700')}>
              {proxyGroups.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewType('providers')}
          className={cn(
            'flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center space-x-1.5',
            viewType === 'providers' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          <span>集合</span>
          {providerList.length > 0 && (
            <span className={cn('px-1.5 py-0.5 rounded-md text-[10px]', viewType === 'providers' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700')}>
              {providerList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewType('subscriptions')}
          className={cn(
            'flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center space-x-1.5',
            viewType === 'subscriptions' ? 'bg-[#3b82f6] text-white shadow-md' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          <Sparkles size={13} className={viewType === 'subscriptions' ? 'text-white' : 'text-indigo-500'} />
          <span>订阅管理</span>
        </button>
      </div>

      {viewType === 'subscriptions' && (
        <SubscriptionManager onRefreshProxies={fetchInitialData} />
      )}

      {viewType !== 'subscriptions' && !status.running && (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 px-8 text-center py-20 animate-in fade-in">
          <Server size={48} className="opacity-20 mb-4" />
          <p className="text-sm">服务未运行<br />请先启动核心或在上方“订阅管理”导入节点</p>
        </div>
      )}

      {viewType !== 'subscriptions' && status.running && apiError && (
        <div className="h-full flex flex-col items-center justify-center px-8 text-center py-16 animate-in fade-in">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <ServerOff size={32} className="text-rose-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">后端 API 响应超时</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            核心正在初始化或外部控制端口未就绪。<br />如需配置节点请点击上方“订阅管理”。
          </p>
          <button
            onClick={() => { void fetchInitialData(); }}
            className="flex items-center space-x-2 bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            <RefreshCw size={14} />
            <span>重新加载</span>
          </button>
        </div>
      )}

      {viewType !== 'subscriptions' && status.running && !apiError && (loading || !proxies) && (
        <div className="h-full flex flex-col items-center justify-center py-20 animate-pulse text-slate-400">
          <Activity size={26} className="text-indigo-500 mb-3" />
          <span className="text-xs font-medium">获取代理信息中...</span>
        </div>
      )}

      {viewType === 'proxies' && status.running && !apiError && proxies && proxyGroups.map(groupName => (
        <ProxyGroupCard
          key={groupName}
          groupName={groupName}
          group={proxies[groupName]}
          proxies={proxies}
          latencies={latencies}
          testingOwners={testingOwners}
          testingNodes={testingNodes}
          isExpanded={expanded[groupName]}
          sortType={groupSorts[groupName] || 'default'}
          onToggleExpand={toggleExpand}
          onToggleSort={toggleGroupSort}
          onTestGroup={handleTestGroup}
          onSelectNode={handleSelectNode}
        />
      ))}

      {viewType === 'providers' && status.running && !apiError && providerList.map(([name, provider]) => (
        <ProxyProviderCard
          key={name}
          name={name}
          provider={provider}
          latencies={latencies}
          testingOwners={testingOwners}
          testingNodes={testingNodes}
          isExpanded={expandedProviders[name]}
          isUpdating={updatingProvider === name}
          onToggleExpand={toggleProviderExpand}
          onUpdate={handleUpdateProvider}
          onTest={handleTestProvider}
          onTestNode={handleTestGroup}
        />
      ))}

      {viewType === 'providers' && status.running && !apiError && providerList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ZapOff size={40} className="opacity-20 mb-3" />
          <p className="text-sm">未发现活跃的外部代理集合</p>
        </div>
      )}
    </div>
  );
}
