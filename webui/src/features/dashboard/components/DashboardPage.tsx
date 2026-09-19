import { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Square,
  Play,
  Smartphone,
  Wifi,
  Radio,
  Usb,
  MemoryStick,
  ArrowUp,
  ArrowDown,
  DownloadCloud,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { SectionTitle, SwitchRow, SelectRow, Switch } from '@/components/ui';
import { ClashClient, type ClashMemory } from '@/lib/clash';
import { boxBridge, notify } from '@/lib/bridge';
import { useProxyData } from '@/features/proxies/hooks/useProxyData';
import { MODE_OPTIONS } from '@/features/proxies/types';
import type { BoxConfig, BoxStatus, TrafficStats } from '@/types/box';

const PROXY_MODE_OPTIONS = [
  { l: '自动', v: '0' },
  { l: 'TPROXY', v: '1' },
  { l: 'REDIRECT', v: '2' },
];

const BIN_NAME_OPTIONS = ['sing-box', 'clash', 'mihomo', 'xray', 'v2ray', 'hysteria'];

const formatProxyMode = (value: unknown) => {
  switch (String(value ?? '0')) {
    case '1':
      return 'TPROXY';
    case '2':
      return 'REDIRECT';
    default:
      return 'AUTO';
  }
};

const formatMemory = (memory: ClashMemory | null) => {
  if (!memory) return '--';
  const candidates = [
    typeof memory.inuse === 'number' ? memory.inuse : null,
    ...Object.values(memory).filter((value): value is number => typeof value === 'number'),
  ].filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

  if (candidates.length === 0) return '--';

  const bytes = candidates[0];
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
};

/** 格式化实时传输速率 */
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${bytesPerSec} B/s`;
}

/** 格式化累计字节量 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

interface DashboardPageProps {
  status: BoxStatus;
  config: BoxConfig;
  handleServiceAction: (action: string) => void;
  actionLoading: string | null;
  handleChange: <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => void;
  handleToggle: (key: string, value: boolean) => void;
  handleToggleAutoStart: (value: boolean) => void;
  /** 切换透明代理开关 */
  handleToggleTproxy?: (enabled: boolean) => Promise<void>;
  /** 实时流量统计（来自 Clash WebSocket） */
  trafficStats?: TrafficStats | null;
}

export function DashboardPage({
  status,
  config,
  handleServiceAction,
  actionLoading,
  handleChange,
  handleToggle,
  handleToggleAutoStart,
  handleToggleTproxy,
  trafficStats,
}: DashboardPageProps) {
  const { currentMode, handleChangeMode } = useProxyData(status);
  const [memory, setMemory] = useState<ClashMemory | null>(null);
  const [downloadingCores, setDownloadingCores] = useState(false);

  const client = useMemo(() => {
    return new ClashClient(
      String(status?.clash_api_port || config?.clash_api_port || 9090),
      String(status?.clash_api_secret || config?.clash_api_secret || '')
    );
  }, [status?.clash_api_port, status?.clash_api_secret, config?.clash_api_port, config?.clash_api_secret]);

  useEffect(() => {
    if (!status?.running) {
      setMemory(null);
      return;
    }

    let cancelled = false;

    const loadMemory = async () => {
      try {
        const data = await client.getMemory();
        if (!cancelled) {
          setMemory(data);
        }
      } catch {
        if (!cancelled) {
          setMemory(null);
        }
      }
    };

    void loadMemory();
    const timer = window.setInterval(loadMemory, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status?.running, client]);

  // 一键下载/更新内核
  const handleDownloadCores = async () => {
    if (downloadingCores) return;
    setDownloadingCores(true);
    notify('开始下载核心，请耐心等待...');
    try {
      const res = await boxBridge.downloadCores();
      notify(`核心下载完成：成功 ${res.installed} 个，失败 ${res.failed} 个`);
    } catch (e) {
      notify(`核心下载失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDownloadingCores(false);
    }
  };

  return (
    <div className="px-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 核心控制主卡片 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80 mt-2 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              当前核心 / 模式
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">
                {config?.bin_name || '未知'}
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-md uppercase transition-colors">
                {formatProxyMode(config?.PROXY_MODE)}
              </span>
            </div>
          </div>

          <div className="min-w-[88px] rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-3 py-2 shadow-sm">
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-80">
              <MemoryStick size={14} />
              <span>内存</span>
            </div>
            <div className="mt-1 text-right text-sm font-bold tabular-nums">
              {status?.running ? formatMemory(memory) : '--'}
            </div>
          </div>
        </div>

        {/* 启停与重启按键 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleServiceAction(status?.running ? 'stop' : 'start')}
            disabled={actionLoading !== null}
            className={`py-3.5 rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-80
              ${status?.running
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 active:bg-indigo-800'}`}
          >
            {actionLoading === 'start' || actionLoading === 'stop' ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : status?.running ? (
              <>
                <Square size={16} className="mr-2" /> 停止 Box
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" /> 启动 Box
              </>
            )}
          </button>
          <button
            onClick={() => handleServiceAction('restart')}
            disabled={!status?.running || actionLoading !== null}
            className="py-3.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
          >
            {actionLoading === 'restart' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" /> 重启 Box
              </>
            )}
          </button>
        </div>

        {/* 状态徽标与透明代理控制行 */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {status?.transparent_proxy_running ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <XCircle size={14} className="text-slate-400" />
              )}
              <span className="font-semibold text-slate-700 dark:text-slate-300">透明代理</span>
            </div>
            <Switch
              checked={Boolean(status?.transparent_proxy_running)}
              disabled={actionLoading === 'tproxy'}
              onChange={(checked: boolean) => {
                if (handleToggleTproxy) {
                  void handleToggleTproxy(checked);
                } else {
                  void boxBridge.tproxy(checked ? 'start' : 'stop')
                    .then(() => handleServiceAction('status'));
                }
              }}
            />
            <span className="text-[11px] text-slate-400">
              {actionLoading === 'tproxy' ? '切换中...' : (status?.transparent_proxy_running ? '生效中' : '已关闭')}
            </span>
          </div>

          <button
            onClick={handleDownloadCores}
            disabled={downloadingCores}
            className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-medium active:scale-95 transition-all"
          >
            {downloadingCores ? <RefreshCw size={13} className="animate-spin" /> : <DownloadCloud size={13} />}
            <span>{downloadingCores ? '下载中...' : '更新核心'}</span>
          </button>
        </div>
      </div>

      {/* 实时流量监控卡片 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/80 transition-colors">
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          实时流量统计
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* 上行 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ArrowUp size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-400">上行速率</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate tabular-nums">
                {status.running && trafficStats ? formatSpeed(trafficStats.uploadSpeed) : '--'}
              </div>
              <div className="text-[10px] text-slate-400 truncate tabular-nums">
                总量: {status.running && trafficStats ? formatBytes(trafficStats.totalUpload) : '--'}
              </div>
            </div>
          </div>

          {/* 下行 */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <ArrowDown size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-400">下行速率</div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate tabular-nums">
                {status.running && trafficStats ? formatSpeed(trafficStats.downloadSpeed) : '--'}
              </div>
              <div className="text-[10px] text-slate-400 truncate tabular-nums">
                总量: {status.running && trafficStats ? formatBytes(trafficStats.totalDownload) : '--'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 全局路由规则设置 */}
      <div>
        <SectionTitle title="全局路由规则" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SelectRow
            label="切换出站模式"
            value={currentMode.toLowerCase()}
            options={MODE_OPTIONS.map((m) => ({ l: m.label, v: m.id }))}
            onChange={(value: string) => handleChangeMode(value as any)}
            border={true}
          />
          <SelectRow
            label="切换代理模式"
            value={String(config?.PROXY_MODE ?? 0)}
            options={PROXY_MODE_OPTIONS}
            onChange={(value: string) => handleChange('PROXY_MODE', parseInt(value, 10))}
            border={true}
          />
          <SelectRow
            label="切换代理核心"
            value={config?.bin_name || 'sing-box'}
            options={BIN_NAME_OPTIONS}
            onChange={(value: string) => handleChange('bin_name', value)}
            border={true}
          />
          <SwitchRow
            label="开机自启动"
            sub="设备启动时自动运行"
            checked={status?.autoStart === true}
            onChange={handleToggleAutoStart}
            border={true}
          />
          <SwitchRow
            label="拦截 QUIC"
            sub="防止应用通过 QUIC 绕过分流规则"
            checked={config?.BLOCK_QUIC === 1}
            onChange={(value: boolean) => handleToggle('BLOCK_QUIC', value)}
            border={false}
          />
        </div>
      </div>

      {/* 代理网络接口开关 */}
      <div>
        <SectionTitle title="代理网络接口" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SwitchRow
            label="移动数据"
            icon={<Smartphone size={18} />}
            checked={config?.PROXY_MOBILE === 1}
            onChange={(value: boolean) => handleToggle('PROXY_MOBILE', value)}
            border={true}
          />
          <SwitchRow
            label="无线网络"
            icon={<Wifi size={18} />}
            checked={config?.PROXY_WIFI === 1}
            onChange={(value: boolean) => handleToggle('PROXY_WIFI', value)}
            border={true}
          />
          <SwitchRow
            label="移动热点"
            icon={<Radio size={18} />}
            checked={config?.PROXY_HOTSPOT === 1}
            onChange={(value: boolean) => handleToggle('PROXY_HOTSPOT', value)}
            border={true}
          />
          <SwitchRow
            label="USB共享"
            icon={<Usb size={18} />}
            checked={config?.PROXY_USB === 1}
            onChange={(value: boolean) => handleToggle('PROXY_USB', value)}
            border={false}
          />
        </div>
      </div>
    </div>
  );
}
