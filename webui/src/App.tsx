import { useState } from 'react';
import {
  RefreshCw,
  Save,
  Home,
  Layers,
  Settings2,
  Smartphone,
  Moon,
  Sun,
  Server,
  ScrollText,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { NavItem } from '@/components/ui';
import { useBoxController } from '@/hooks/useBoxController';
import { useTheme } from '@/hooks/useTheme';
import { useTrafficData } from '@/features/dashboard/hooks/useTrafficData';
import { TabHome } from '@/tabs/TabHome';
import { TabProxies } from '@/tabs/TabProxies';
import { TabApps } from '@/tabs/TabApps';
import { TabLogs } from '@/tabs/TabLogs';
import { TabSettings } from '@/tabs/TabSettings';
import '@/index.css';

/** 格式化紧凑速率字符串用于顶部栏 */
function formatHeaderSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)}M`;
  if (bytesPerSec >= 1024) return `${Math.round(bytesPerSec / 1024)}K`;
  return `${bytesPerSec}B`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'proxies' | 'apps' | 'logs' | 'settings'>('home');
  const { theme, isDark, cycleTheme } = useTheme();
  const {
    loading,
    status,
    config,
    appList,
    actionLoading,
    hasChanges,
    handleServiceAction,
    handleToggle,
    handleChange,
    handleSaveAndApply,
    handleToggleAutoStart,
  } = useBoxController();

  // 实时流量统计 Hook（服务运行中时通过 WebSocket 监听）
  const trafficStats = useTrafficData({
    running: status.running,
    clash_api_port: String(status.clash_api_port || config.clash_api_port || '9090'),
    clash_api_secret: String(status.clash_api_secret || config.clash_api_secret || ''),
  });

  if (loading) {
    return (
      <div className={`flex min-h-dvh items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="animate-spin text-indigo-500">
          <RefreshCw size={28} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto h-dvh max-w-md overflow-hidden font-sans shadow-2xl transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'
      } relative`}
    >
      {/* 顶部导航状态栏 */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 transition-colors">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* 左侧：服务状态与 PID */}
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                status.running
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">
              Box 控制台
            </h1>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center transition-colors">
              {status.running ? `PID: ${status.pid}` : 'STOPPED'}
            </div>
          </div>

          {/* 右侧：实时速率胶囊 + 主题切换 */}
          <div className="flex items-center space-x-2">
            {status.running && trafficStats && (
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                <span className="flex items-center text-emerald-500">
                  <ArrowUp size={11} className="mr-0.5" />
                  {formatHeaderSpeed(trafficStats.uploadSpeed)}
                </span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="flex items-center text-indigo-500">
                  <ArrowDown size={11} className="mr-0.5" />
                  {formatHeaderSpeed(trafficStats.downloadSpeed)}
                </span>
              </div>
            )}

            <button
              onClick={cycleTheme}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
              title="切换主题"
            >
              {theme === 'system' ? (
                <Smartphone size={15} />
              ) : theme === 'dark' ? (
                <Moon size={15} />
              ) : (
                <Sun size={15} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 主视图区域 */}
      <main className="h-[calc(100dvh-53px)] overflow-y-auto pb-28 pt-1 scrollbar-hide">
        {activeTab === 'home' && (
          <TabHome
            status={status}
            config={config}
            handleServiceAction={handleServiceAction}
            actionLoading={actionLoading}
            handleChange={handleChange}
            handleToggle={handleToggle}
            handleToggleAutoStart={handleToggleAutoStart}
            trafficStats={trafficStats}
          />
        )}
        {activeTab === 'proxies' && <TabProxies status={status} />}
        {activeTab === 'apps' && (
          <TabApps
            config={config}
            handleToggle={handleToggle}
            handleChange={handleChange}
            appList={appList}
          />
        )}
        {activeTab === 'logs' && <TabLogs status={status} />}
        {activeTab === 'settings' && (
          <TabSettings
            status={status}
            config={config}
            handleToggle={handleToggle}
            handleChange={handleChange}
          />
        )}
      </main>

      {/* 悬浮保存按钮 */}
      {hasChanges && (
        <div className="absolute bottom-16 right-5 z-40 animate-in slide-in-from-bottom-4 zoom-in duration-200">
          <button
            onClick={handleSaveAndApply}
            disabled={actionLoading === 'save'}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-3 rounded-full shadow-[0_4px_16px_rgba(99,102,241,0.4)] flex items-center space-x-2 font-bold active:scale-95 transition-all"
          >
            {actionLoading === 'save' ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span className="text-sm">{actionLoading === 'save' ? '应用中...' : '保存'}</span>
          </button>
        </div>
      )}

      {/* 底部 5-Tab 导航 */}
      <nav className="absolute bottom-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 pb-safe flex justify-around items-center z-30 transition-colors">
        <NavItem
          icon={<Home size={22} />}
          label="首页"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <NavItem
          icon={<Server size={22} />}
          label="代理"
          active={activeTab === 'proxies'}
          onClick={() => setActiveTab('proxies')}
        />
        <NavItem
          icon={<Layers size={22} />}
          label="分流"
          active={activeTab === 'apps'}
          onClick={() => setActiveTab('apps')}
        />
        <NavItem
          icon={<ScrollText size={22} />}
          label="日志"
          active={activeTab === 'logs'}
          onClick={() => setActiveTab('logs')}
        />
        <NavItem
          icon={<Settings2 size={22} />}
          label="设置"
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        />
      </nav>
    </div>
  );
}
