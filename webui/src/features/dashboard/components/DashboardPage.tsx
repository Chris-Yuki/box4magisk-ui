import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Square, Play, Smartphone, Wifi, Radio, Usb, MemoryStick, AlertTriangle, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { SectionTitle, SwitchRow, SelectRow } from '@/components/ui';
import { ClashClient, type ClashMemory } from '@/lib/clash';
import { useProxyData } from '@/features/proxies/hooks/useProxyData';
import { MODE_OPTIONS } from '@/features/proxies/types';
import type { BoxConfig, BoxStatus } from '@/types/box';

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

interface DashboardPageProps {
  status: BoxStatus;
  config: BoxConfig;
  handleServiceAction: (action: string) => void;
  actionLoading: string | null;
  handleChange: <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => void;
  handleToggle: (key: string, value: boolean) => void;
  handleToggleAutoStart: (value: boolean) => void;
  handleClearError?: () => void;
}

export function DashboardPage({ status, config, handleServiceAction, actionLoading, handleChange, handleToggle, handleToggleAutoStart, handleClearError }: DashboardPageProps) {
  const { currentMode, handleChangeMode } = useProxyData(status);
  const [memory, setMemory] = useState<ClashMemory | null>(null);
  const [showFullError, setShowFullError] = useState(false);
  const [copied, setCopied] = useState(false);

  const client = useMemo(() => {
    return new ClashClient(String(status?.clash_api_port || config?.clash_api_port || 9090), String(status?.clash_api_secret || config?.clash_api_secret || ''));
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

  const isBusy = Boolean(status?.busy || actionLoading !== null);

  return (
    <div className="px-4 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {status?.error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-600 dark:text-rose-400 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2 font-bold text-sm">
              <AlertTriangle size={18} className="shrink-0 text-rose-500" />
              <span>{status.step_label || '服务异常 / 配置校验失败'}</span>
            </div>
            {handleClearError && (
              <button
                onClick={handleClearError}
                className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400 hover:text-rose-600 transition-colors"
                title="关闭提示"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="text-xs font-mono bg-rose-500/5 rounded-lg p-2.5 break-all select-text border border-rose-500/20 max-h-36 overflow-y-auto whitespace-pre-wrap">
            {showFullError ? status.error : status.error.slice(0, 180) + (status.error.length > 180 ? '...' : '')}
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            {status.error.length > 180 && (
              <button
                onClick={() => setShowFullError(!showFullError)}
                className="flex items-center space-x-1 font-semibold hover:underline"
              >
                <span>{showFullError ? '收起详情' : '展开完整日志'}</span>
                {showFullError ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <button
              onClick={() => {
                if (status.error) {
                  void navigator.clipboard?.writeText(status.error);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              className="ml-auto flex items-center space-x-1 font-semibold px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors active:scale-95"
            >
              {copied ? <><Check size={13} className="text-emerald-500 mr-1" /> <span>已复制</span></> : <><Copy size={13} className="mr-1" /> <span>复制报错</span></>}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 mt-2 transition-colors">
        <div className="flex justify-between items-center mb-5">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">当前核心 / 模式</span>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">{config?.bin_name || '未知'}</span>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-md uppercase transition-colors">{formatProxyMode(config?.PROXY_MODE)}</span>
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

        {status?.busy && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 animate-pulse">
            <div className="flex items-center space-x-2 font-medium">
              <RefreshCw size={13} className="animate-spin text-indigo-500" />
              <span>{status.step_label || '正在执行后台任务...'}</span>
            </div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider opacity-75">Processing</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleServiceAction(status?.running ? 'stop' : 'start')}
            disabled={isBusy}
            className={`py-3.5 rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
              ${status?.running
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'}`}
          >
            {isBusy && (actionLoading === 'start' || actionLoading === 'stop' || status?.last_action === 'start' || status?.last_action === 'stop')
              ? <RefreshCw size={18} className="animate-spin" />
              : status?.running
                ? <><Square size={16} className="mr-2" /> 停止 Box</>
                : <><Play size={16} className="mr-2" /> 启动 Box</>}
          </button>
          <button
            onClick={() => handleServiceAction('restart')}
            disabled={!status?.running || isBusy}
            className="py-3.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
          >
            {isBusy && (actionLoading === 'restart' || status?.last_action === 'restart')
              ? <RefreshCw size={16} className="animate-spin" />
              : <><RefreshCw size={16} className="mr-2" /> 重启 Box</>}
          </button>
        </div>
      </div>

      <div>
        <SectionTitle title="全局路由规则" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SelectRow
            label="切换出站模式"
            value={currentMode.toLowerCase()}
            options={MODE_OPTIONS.map(m => ({ l: m.label, v: m.id }))}
            onChange={(value: string) => handleChangeMode(value as any)}
            border={true}
          />
          <SelectRow label="切换代理模式" value={String(config?.PROXY_MODE ?? 0)} options={PROXY_MODE_OPTIONS} onChange={(value: string) => handleChange('PROXY_MODE', parseInt(value, 10))} border={true} />
          <SelectRow label="切换代理核心" value={config?.bin_name || 'sing-box'} options={BIN_NAME_OPTIONS} onChange={(value: string) => handleChange('bin_name', value)} border={true} />
          <SwitchRow label="开机自启动" sub="设备启动时自动运行" checked={status?.autoStart === true} onChange={handleToggleAutoStart} border={true} />
          <SwitchRow label="拦截 QUIC" sub="防止应用通过 QUIC 绕过分流规则" checked={config?.BLOCK_QUIC === 1} onChange={(value: boolean) => handleToggle('BLOCK_QUIC', value)} border={false} />
        </div>
      </div>

      <div>
        <SectionTitle title="代理网络接口" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <SwitchRow label="移动数据" icon={<Smartphone size={18} />} checked={config?.PROXY_MOBILE === 1} onChange={(value: boolean) => handleToggle('PROXY_MOBILE', value)} border={true} />
          <SwitchRow label="无线网络" icon={<Wifi size={18} />} checked={config?.PROXY_WIFI === 1} onChange={(value: boolean) => handleToggle('PROXY_WIFI', value)} border={true} />
          <SwitchRow label="移动热点" icon={<Radio size={18} />} checked={config?.PROXY_HOTSPOT === 1} onChange={(value: boolean) => handleToggle('PROXY_HOTSPOT', value)} border={true} />
          <SwitchRow label="USB共享" icon={<Usb size={18} />} checked={config?.PROXY_USB === 1} onChange={(value: boolean) => handleToggle('PROXY_USB', value)} border={false} />
        </div>
      </div>
    </div>
  );
}
