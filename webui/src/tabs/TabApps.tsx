import { useState, useMemo, useEffect } from 'react';
import { Search, Check, RefreshCw } from 'lucide-react';
import { Switch, Select } from '@/components/ui';
import { getRunningPackages } from '@/lib/bridge';
import type { AppInfo, BoxConfig, BoxControllerState } from '@/types/box';

const DEFAULT_ANDROID_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="12" fill="#E9F7EF"/>
      <g transform="translate(2 1.5)">
        <rect x="8" y="11" width="24" height="18" rx="6.5" fill="#3DDC84"/>
        <rect x="10.5" y="29.5" width="5.5" height="2.5" rx="1.25" fill="#3DDC84"/>
        <rect x="24" y="29.5" width="5.5" height="2.5" rx="1.25" fill="#3DDC84"/>
        <rect x="6.3" y="15" width="2.7" height="11" rx="1.35" fill="#3DDC84"/>
        <rect x="31" y="15" width="2.7" height="11" rx="1.35" fill="#3DDC84"/>
        <rect x="14.1" y="16.2" width="2.8" height="2.8" rx="1.4" fill="#ffffff"/>
        <rect x="23.1" y="16.2" width="2.8" height="2.8" rx="1.4" fill="#ffffff"/>
        <path d="M13.8 10.2 11.2 6.8" stroke="#3DDC84" stroke-width="2" stroke-linecap="round"/>
        <path d="M26.2 10.2 28.8 6.8" stroke="#3DDC84" stroke-width="2" stroke-linecap="round"/>
      </g>
    </svg>
  `);

// 筛选分类：用户应用、系统应用、正在运行、全部
type FilterType = 'user' | 'system' | 'running' | 'all';
const FILTER_LABELS: Record<FilterType, string> = {
  running: '运行中',
  user: '用户',
  system: '系统',
  all: '全部',
};

type TabAppsProps = Pick<BoxControllerState, 'config' | 'handleToggle' | 'handleChange' | 'appList'>;

export function TabApps({ config, handleToggle, handleChange, appList }: TabAppsProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('running');
  // 正在运行的应用包名集合
  const [runningPkgs, setRunningPkgs] = useState<Set<string>>(new Set());
  const [loadingRunning, setLoadingRunning] = useState(false);

  // 组件挂载时自动获取一次运行中的应用列表
  useEffect(() => {
    refreshRunningApps();
  }, []);

  /** 刷新运行中应用列表 */
  const refreshRunningApps = async () => {
    setLoadingRunning(true);
    try {
      const pkgs = await getRunningPackages();
      setRunningPkgs(pkgs);
    } catch { /* ignore */ }
    setLoadingRunning(false);
  };

  const currentListKey = config?.APP_PROXY_MODE === 'whitelist' ? 'PROXY_APPS_LIST' : 'BYPASS_APPS_LIST';
  const rawString = config?.[currentListKey] || '';

  const checkedSet = useMemo(() => {
    return new Set(String(rawString).split(/\s+/).filter(Boolean));
  }, [rawString]);

  const filteredApps = useMemo(() => {
    return (appList || []).filter((app: AppInfo) => {
      // 按分类筛选
      if (filter === 'user' && app.isSystem) return false;
      if (filter === 'system' && !app.isSystem) return false;
      if (filter === 'running' && !runningPkgs.has(app.packageName)) return false;
      // 搜索过滤
      if (search) {
        const lowerSearch = search.toLowerCase();
        return app.appLabel.toLowerCase().includes(lowerSearch) || app.packageName.toLowerCase().includes(lowerSearch);
      }
      return true;
    });
  }, [appList, search, filter, runningPkgs]);

  const toggleApp = (pkg: string) => {
    if (config?.APP_PROXY_ENABLE === 0) return;
    const newSet = new Set(checkedSet);
    if (newSet.has(pkg)) newSet.delete(pkg);
    else newSet.add(pkg);
    handleChange(currentListKey, Array.from(newSet).join('\n'));
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="pb-2 shrink-0 mt-2">
        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl px-4 py-3 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between shadow-sm transition-colors mx-4">
          <div className="font-bold text-indigo-900 dark:text-indigo-100 transition-colors">应用分流</div>
          <Switch checked={config?.APP_PROXY_ENABLE === 1} onChange={(v: boolean) => handleToggle('APP_PROXY_ENABLE', v)} />
        </div>
      </div>

      <div className={`flex-1 bg-white dark:bg-slate-900 rounded-3xl flex flex-col pt-1 transition-all duration-300 mx-4 shadow-sm border border-slate-100 dark:border-slate-800 ${config?.APP_PROXY_ENABLE === 1 ? 'opacity-100' : 'opacity-40 grayscale-[30%]'}`}>
        <div className="px-4 pt-4 pb-3 space-y-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="搜索应用或包名..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={config?.APP_PROXY_ENABLE === 0}
                className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/50 rounded-xl py-2 pl-10 pr-4 text-sm transition outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <Select
              className="w-24"
              value={config?.APP_PROXY_MODE || 'blacklist'}
              options={[
                { l: '黑名单', v: 'blacklist' },
                { l: '白名单', v: 'whitelist' }
              ]}
              onChange={(v: string) => handleChange('APP_PROXY_MODE', v as BoxConfig['APP_PROXY_MODE'])}
              disabled={config?.APP_PROXY_ENABLE === 0}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide items-center">
              {/* 分类筛选标签 */}
              {(['running', 'user', 'system', 'all'] as const).map(t => (
                <button
                  key={t} onClick={() => setFilter(t)} disabled={config?.APP_PROXY_ENABLE === 0}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${filter === t ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                >
                  {FILTER_LABELS[t]}
                  {/* 运行中分类显示数量 */}
                  {t === 'running' && runningPkgs.size > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">({runningPkgs.size})</span>
                  )}
                </button>
              ))}
              {/* 刷新运行中应用按钮 */}
              <button
                onClick={refreshRunningApps}
                disabled={loadingRunning || config?.APP_PROXY_ENABLE === 0}
                className="p-1.5 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors disabled:opacity-40"
                title="刷新运行中应用"
              >
                <RefreshCw size={14} className={loadingRunning ? 'animate-spin' : ''} />
              </button>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md shrink-0 transition-colors">
              已选 {checkedSet.size}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-32">
          {filteredApps.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-10 text-sm">
              {filter === 'running' && runningPkgs.size === 0 ? '正在获取运行中应用...' : '未找到应用或列表为空'}
            </div>
          ) : (
            filteredApps.map((app: AppInfo) => {
              const isChecked = checkedSet.has(app.packageName);
              const isRunning = runningPkgs.has(app.packageName);
              return (
                <div
                  key={app.packageName}
                  onClick={() => toggleApp(app.packageName)}
                  className={`flex items-center p-3 rounded-xl transition-colors ${config?.APP_PROXY_ENABLE === 1 ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer active:scale-[0.98]' : 'cursor-not-allowed'}`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700/60">
                    <img
                      src={`ksu://icon/${app.packageName}`}
                      alt={app.appLabel}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== DEFAULT_ANDROID_ICON) {
                          img.src = DEFAULT_ANDROID_ICON;
                        }
                      }}
                    />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate transition-colors">{app.appLabel}</span>
                      {/* 运行状态指示点 */}
                      {isRunning && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="运行中" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 transition-colors">{app.packageName}</div>
                  </div>
                  <div className="ml-3 shrink-0">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-transparent'}`}>
                      {isChecked && <Check size={14} className="text-white" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
