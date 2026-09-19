import { useState, useMemo } from 'react';
import { X, Search, Activity, Network, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState, Badge } from '@/components/ui';
import { useConnections } from '@/features/connections/hooks/useConnections';

interface ConnectionsPageProps {
  status: {
    running: boolean;
    clash_api_port: string;
    clash_api_secret: string;
    bin_name: string;
  };
}

/** 格式化字节大小 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function ConnectionsPage({ status }: ConnectionsPageProps) {
  const {
    connections,
    loading,
    totalDownload,
    totalUpload,
    isSupported,
    closeConnection,
    closeAllConnections,
  } = useConnections(status);

  const [search, setSearch] = useState('');
  const [closingAll, setClosingAll] = useState(false);

  // 搜索过滤
  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections;
    const kw = search.toLowerCase();
    return connections.filter((c) => {
      const host = (c.metadata.host || c.metadata.destinationIP || '').toLowerCase();
      const rule = (c.rule || '').toLowerCase();
      const node = (c.chains?.[c.chains.length - 1] || '').toLowerCase();
      return host.includes(kw) || rule.includes(kw) || node.includes(kw);
    });
  }, [connections, search]);

  if (!isSupported) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Network size={36} />}
          title="核心暂不支持连接管理"
          description={`当前核心 (${status.bin_name}) 未开放兼容的连接查看接口，目前支持 mihomo、clash 与 sing-box`}
        />
      </div>
    );
  }

  if (!status.running) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<Activity size={36} />}
          title="服务未运行"
          description="请先在首页启动代理核心"
        />
      </div>
    );
  }

  const handleCloseAll = async () => {
    if (closingAll) return;
    setClosingAll(true);
    await closeAllConnections();
    setClosingAll(false);
  };

  return (
    <div className="space-y-3 pb-8 animate-in fade-in duration-200">
      {/* 顶部统计与清空栏 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/80 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              活跃连接
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
              {connections.length} <span className="text-xs font-normal text-slate-400">个连接</span>
            </div>
          </div>

          <button
            onClick={handleCloseAll}
            disabled={connections.length === 0 || closingAll}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-xs font-bold transition-all disabled:opacity-40 active:scale-95 flex items-center gap-1"
          >
            <X size={14} />
            <span>{closingAll ? '正在断开...' : '断开全部'}</span>
          </button>
        </div>

        {/* 累计传输统计 */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
            <ArrowUp size={13} className="text-emerald-500 shrink-0" />
            <span className="text-slate-400">总上传:</span>
            <span className="font-semibold">{formatBytes(totalUpload)}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
            <ArrowDown size={13} className="text-indigo-500 shrink-0" />
            <span className="text-slate-400">总下载:</span>
            <span className="font-semibold">{formatBytes(totalDownload)}</span>
          </div>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          size={15}
        />
        <input
          type="text"
          placeholder="搜索主机、规则或节点..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs transition outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-500/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />
      </div>

      {/* 列表渲染 */}
      {filteredConnections.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title={loading ? '正在获取连接...' : '暂无活跃连接'}
            description={search ? '没有匹配的连接记录' : '网络处于空闲状态'}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConnections.map((c) => {
            const host = c.metadata.host || c.metadata.destinationIP;
            const port = c.metadata.destinationPort;
            const node = c.chains?.[c.chains.length - 1] || 'DIRECT';

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800/80 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                {/* 连接信息 */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <Badge variant={c.metadata.network.toUpperCase() === 'UDP' ? 'warning' : 'info'} size="sm">
                      {c.metadata.network.toUpperCase()}
                    </Badge>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate font-mono">
                      {host}:{port}
                    </span>
                  </div>

                  {/* 规则和出口节点 */}
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    <span className="truncate max-w-[140px]" title={c.rule}>
                      规则: {c.rule || 'Default'}
                    </span>
                    <span>•</span>
                    <span className="text-indigo-500 font-medium truncate max-w-[100px]" title={node}>
                      {node}
                    </span>
                  </div>

                  {/* 流量数据 */}
                  <div className="flex items-center space-x-3 text-[10px] text-slate-400 tabular-nums">
                    <span>↑ {formatBytes(c.upload)}</span>
                    <span>↓ {formatBytes(c.download)}</span>
                  </div>
                </div>

                {/* 断开按钮 */}
                <button
                  onClick={() => closeConnection(c.id)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-90 transition-all shrink-0"
                  title="断开此连接"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
