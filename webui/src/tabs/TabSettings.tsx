import { useState } from 'react';
import { Rss, FileCode, ChevronRight } from 'lucide-react';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { SubscriptionPage } from '@/features/subscriptions/components/SubscriptionPage';
import { ConfigEditorPage } from '@/features/config-editor/components/ConfigEditorPage';
import type { BoxControllerState } from '@/types/box';

type TabSettingsProps = Pick<
  BoxControllerState,
  'status' | 'config' | 'handleToggle' | 'handleChange' | 'handleToggleTproxy'
>;

type SubView = 'main' | 'subscriptions' | 'config-editor';

/**
 * 设置 Tab 根组件
 * 支持在主设置页面与两个核心子功能页面（订阅管理、配置文件编辑）之间平滑切换
 */
export function TabSettings(props: TabSettingsProps) {
  const [subView, setSubView] = useState<SubView>('main');
  const binName = props.status.bin_name || 'sing-box';

  // 子视图：订阅管理
  if (subView === 'subscriptions') {
    return (
      <div className="px-4 pt-2">
        <SubscriptionPage
          binName={binName}
          onBack={() => setSubView('main')}
        />
      </div>
    );
  }

  // 子视图：配置文件编辑
  if (subView === 'config-editor') {
    return (
      <div className="px-4 pt-2">
        <ConfigEditorPage
          binName={binName}
          boxConfigFile={props.status.box_config_file}
          tproxyConfigFile={props.status.tproxy_config_file}
          onBack={() => setSubView('main')}
        />
      </div>
    );
  }

  // 默认主视图：顶部快捷入口卡片 + 原有详细网络配置列表
  return (
    <div className="space-y-4">
      {/* 顶部两大核心高级功能入口 */}
      <div className="px-4 pt-2 grid grid-cols-2 gap-3">
        {/* 订阅管理入口 */}
        <button
          onClick={() => setSubView('subscriptions')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all text-left group active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Rss size={17} />
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              订阅管理
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            节点链接下载与自动更新
          </p>
        </button>

        {/* 配置文件编辑入口 */}
        <button
          onClick={() => setSubView('config-editor')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all text-left group active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <FileCode size={17} />
          </div>
          <div className="flex items-center justify-between">
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
              配置文件
            </div>
            <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            查看与修改核心源配置
          </p>
        </button>
      </div>

      {/* 原有详细网络与系统设置 */}
      <SettingsPage {...props} />
    </div>
  );
}
