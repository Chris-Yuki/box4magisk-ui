import { useCallback, useMemo } from 'react';
import { Activity, RefreshCw, Server, ServerOff, ZapOff, Network } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ProxyGroupCard } from '@/features/proxies/components/ProxyGroupCard';
import { ProxyProviderCard } from '@/features/proxies/components/ProxyProviderCard';
import { ConnectionsPage } from '@/features/connections/components/ConnectionsPage';
import { useProxyData } from '@/features/proxies/hooks/useProxyData';
import { useProxyPrefs } from '@/features/proxies/hooks/useProxyPrefs';
import { type NodeSortType, type TabProxiesProps } from '@/features/proxies/types';

const GROUP_TYPES = ['Selector', 'URLTest', 'Fallback', 'LoadBalance'];
const CONNECTION_SUPPORTED_CORES = ['mihomo', 'clash', 'sing-box'];

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

  const isConnectionSupported = CONNECTION_SUPPORTED_CORES.includes(status.bin_name || 'sing-box');

  if (!status.running) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 px-8 text-center pb-20 animate-in fade-in">
        <Server size={48} className="opacity-20 mb-4" />
        <p className="text-sm">服务未运行<br />请先启动核心</p>
      </div>
    );
  }

  if (apiError && viewType !== 'connections') {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center pb-20 animate-in fade-in">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <ServerOff size={40} className="text-rose-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">后端 API 连接失败</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          无法连接到核心代理面板接口。<br />请检查代理核心是否已成功启动。
        </p>
        <button
          onClick={() => { void fetchInitialData(); }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full text-sm font-bold shadow-[0_4px_16px_rgba(99,102,241,0.3)] active:scale-95 transition-all"
        >
          <RefreshCw size={18} />
          <span>重新连接</span>
        </button>
      </div>
    );
  }

  if ((loading || !proxies) && viewType !== 'connections') {
    return (
      <div className="h-full flex flex-col items-center justify-center pb-20 animate-pulse text-slate-400">
        <Activity size={28} className="text-indigo-500 mb-4" />
        <span className="text-sm font-medium">获取代理信息中...</span>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 顶部三段式切换：代理组 / 代理集合 / 活跃连接 */}
      <div className="flex bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-2xl mb-4">
        <button
          onClick={() => setViewType('proxies')}
          className={cn(
            'flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center space-x-1.5',
            viewType === 'proxies'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
          )}
        >
          <span>代理组</span>
          <span className={cn('px-1.5 py-0.2 rounded-md text-[10px]', viewType === 'proxies' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700')}>
            {proxyGroups.length}
          </span>
        </button>

        <button
          onClick={() => setViewType('providers')}
          className={cn(
            'flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center space-x-1.5',
            viewType === 'providers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
          )}
        >
          <span>代理集合</span>
          <span className={cn('px-1.5 py-0.2 rounded-md text-[10px]', viewType === 'providers' ? 'bg-white/20' : 'bg-slate-300/50 dark:bg-slate-700')}>
            {providerList.length}
          </span>
        </button>

        {/* 仅在支持的核心上展示连接 Tab */}
        {isConnectionSupported && (
          <button
            onClick={() => setViewType('connections')}
            className={cn(
              'flex-1 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center space-x-1.5',
              viewType === 'connections'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
          >
            <Network size={13} />
            <span>连接</span>
          </button>
        )}
      </div>

      {/* 代理组视图 */}
      {viewType === 'proxies' && proxies && proxyGroups.map(groupName => (
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

      {/* 代理集合视图 */}
      {viewType === 'providers' && providerList.map(([name, provider]) => (
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

      {viewType === 'providers' && providerList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ZapOff size={40} className="opacity-20 mb-3" />
          <p className="text-sm">未发现活跃的外部代理集合</p>
        </div>
      )}

      {/* 活跃连接视图 */}
      {viewType === 'connections' && (
        <ConnectionsPage
          status={{
            running: status.running,
            clash_api_port: status.clash_api_port,
            clash_api_secret: status.clash_api_secret,
            bin_name: status.bin_name || 'sing-box',
          }}
        />
      )}
    </div>
  );
}
