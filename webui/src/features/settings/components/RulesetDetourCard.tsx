import { useState } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useRulesetDetour } from '@/features/settings/hooks/useRulesetDetour';
import type { BoxStatus } from '@/types/box';

interface RulesetDetourCardProps {
  status: BoxStatus;
}

export function RulesetDetourCard({ status }: RulesetDetourCardProps) {
  const {
    outbounds,
    currentDetour,
    hasMissingDetour,
    ruleSetCount,
    loading,
    saving,
    updateDetour,
    refresh,
  } = useRulesetDetour(status);

  const [selectedDetour, setSelectedDetour] = useState<string>('');

  const activeDetour = selectedDetour || currentDetour;
  const isSingBox = (status?.bin_name || 'sing-box') === 'sing-box';

  if (!isSingBox) return null;

  const handleChange = async (newVal: string) => {
    setSelectedDetour(newVal);
    await updateDetour(newVal);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/80 transition-all space-y-3">
      {/* 头部标题与徽标 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Download size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              规则集更新出站
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              远程规则集 (GeoSite/GeoIP) 下载与定时更新链路
            </p>
          </div>
        </div>

        {/* 状态徽标 */}
        {hasMissingDetour ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
            <AlertTriangle size={11} />
            待适配
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
            <ShieldCheck size={11} />
            已生效 ({ruleSetCount} 条)
          </span>
        )}
      </div>

      {/* 选择行 */}
      <div className="pt-1">
        <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100/80 dark:border-slate-700/50">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            下载出站节点 (Detour)
          </span>

          <div className="flex items-center space-x-2">
            {saving ? (
              <div className="flex items-center space-x-1.5 text-xs text-indigo-500 font-semibold px-2 py-1">
                <RefreshCw size={13} className="animate-spin" />
                <span>应用中...</span>
              </div>
            ) : (
              <select
                value={activeDetour}
                onChange={(e) => void handleChange(e.target.value)}
                disabled={loading || saving || outbounds.length === 0}
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                {outbounds.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag === '手动切换' || tag === 'Proxy'
                      ? `${tag} (代理节点 · 推荐)`
                      : tag === '本地直连' || tag === 'direct'
                      ? `${tag} (本地直连)`
                      : tag}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => void refresh()}
              disabled={loading || saving}
              title="重新读取配置"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 底部贴心解释 */}
      <div className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 flex items-start space-x-1.5 px-0.5">
        <CheckCircle2 size={13} className="text-indigo-500 shrink-0 mt-0.5" />
        <span>
          默认通过代理出站更新可有效解决 GitHub/CDN 域名污染或阻断问题；切换后会自动批量写入各规则集并优雅重载 sing-box 服务。
        </span>
      </div>
    </div>
  );
}
