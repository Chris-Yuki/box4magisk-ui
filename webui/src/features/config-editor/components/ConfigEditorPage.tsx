import { useState, useEffect, useMemo } from 'react';
import {
  Save,
  AlertTriangle,
  FileCode,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui';
import { boxBridge, notify } from '@/lib/bridge';
import { useConfigEditor } from '../hooks/useConfigEditor';

interface ConfigEditorPageProps {
  binName: string;
  boxConfigFile?: string;
  tproxyConfigFile?: string;
  onBack?: () => void;
}

export function ConfigEditorPage({
  binName,
  boxConfigFile = '/data/adb/box/scripts/box.config',
  tproxyConfigFile = '/data/adb/box/scripts/tproxy.conf',
  onBack,
}: ConfigEditorPageProps) {
  const {
    content,
    setContent,
    loading,
    saving,
    currentPath,
    loadFile,
    saveFile,
  } = useConfigEditor();

  // 根据当前核心推测主要配置文件路径
  const coreConfigFile = useMemo(() => {
    switch (binName) {
      case 'sing-box':
        return '/data/adb/box/sing-box/config.json';
      case 'clash':
        return '/data/adb/box/clash/config.yaml';
      case 'mihomo':
        return '/data/adb/box/mihomo/config.yaml';
      case 'xray':
        return '/data/adb/box/xray/config.json';
      case 'v2ray':
        return '/data/adb/box/v2ray/config.json';
      case 'hysteria':
        return '/data/adb/box/hysteria/config.yaml';
      default:
        return `/data/adb/box/${binName}/config.json`;
    }
  }, [binName]);

  // 预设可编辑的文件列表
  const presetFiles = useMemo(() => [
    { label: `${binName} 主配置`, path: coreConfigFile },
    { label: 'box.config 模块配置', path: boxConfigFile },
    { label: 'tproxy.conf 规则配置', path: tproxyConfigFile },
  ], [binName, coreConfigFile, boxConfigFile, tproxyConfigFile]);

  const [selectedPath, setSelectedPath] = useState(presetFiles[0].path);
  const [customPath, setCustomPath] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // 初始加载第一个预设文件
  useEffect(() => {
    if (selectedPath) {
      void loadFile(selectedPath);
    }
  }, [selectedPath, loadFile]);

  // 实时 JSON 校验检测（若以 .json 结尾）
  const jsonSyntaxStatus = useMemo(() => {
    if (!currentPath || !currentPath.endsWith('.json') || !content.trim()) {
      return null;
    }
    try {
      JSON.parse(content);
      return { valid: true, error: null };
    } catch (e) {
      return { valid: false, error: (e as Error).message };
    }
  }, [currentPath, content]);

  // 执行保存并触发核心重启
  const handleConfirmSave = async () => {
    if (!currentPath) return;
    const ok = await saveFile(currentPath, content);
    setIsConfirmModalOpen(false);

    if (ok) {
      setRestarting(true);
      notify('正在重启核心以使新配置生效...');
      try {
        await boxBridge.service('restart');
        notify('服务已成功重启');
      } catch (e) {
        notify(`服务重启失败: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setRestarting(false);
      }
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* 顶部导航标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xs font-bold"
            >
              ← 返回设置
            </button>
          )}
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            配置文件编辑
          </h2>
        </div>

        <button
          onClick={() => setIsConfirmModalOpen(true)}
          disabled={loading || saving || restarting}
          className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 active:scale-95"
        >
          {saving || restarting ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          <span>{saving ? '保存中...' : restarting ? '重启中...' : '保存生效'}</span>
        </button>
      </div>

      {/* 风险警告横幅 */}
      <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start space-x-2.5">
        <AlertTriangle size={17} className="text-rose-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-[11px] leading-relaxed">
          <span className="font-bold">⚠️ 高级选项，请谨慎修改：</span>
          <p className="opacity-90">
            配置文件语法错误会导致代理核心无法启动或网络流量完全阻断。保存时系统将自动写回目标文件并重启服务。
          </p>
        </div>
      </div>

      {/* 预设文件切换标签 */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          选择配置文件
        </div>
        <div className="flex flex-wrap gap-2">
          {presetFiles.map((file) => {
            const isSelected = selectedPath === file.path;
            return (
              <button
                key={file.path}
                onClick={() => {
                  setSelectedPath(file.path);
                  setCustomPath('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <FileCode size={13} />
                <span>{file.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 自定义文件路径输入 */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="输入自定义路径，例如: /data/adb/box/..."
          value={customPath}
          onChange={(e) => setCustomPath(e.target.value)}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs outline-none text-slate-800 dark:text-slate-200 font-mono"
        />
        <button
          onClick={() => {
            if (customPath.trim()) {
              setSelectedPath(customPath.trim());
            }
          }}
          disabled={!customPath.trim() || loading}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40"
        >
          读取
        </button>
      </div>

      {/* 当前文件路径指示 */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-xl truncate">
        <span className="truncate">路径: {currentPath || '未选择'}</span>
        {jsonSyntaxStatus && (
          <div className="flex items-center space-x-1 shrink-0 ml-2">
            {jsonSyntaxStatus.valid ? (
              <span className="flex items-center text-emerald-500 font-bold">
                <CheckCircle2 size={12} className="mr-0.5" /> JSON 格式正常
              </span>
            ) : (
              <span className="flex items-center text-rose-500 font-bold" title={jsonSyntaxStatus.error || ''}>
                <XCircle size={12} className="mr-0.5" /> JSON 语法错误
              </span>
            )}
          </div>
        )}
      </div>

      {/* 文本编辑器区域 */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 text-xs">
            <RefreshCw size={24} className="animate-spin text-indigo-500 mb-2" />
            <span>正在读取文件内容...</span>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-xs leading-relaxed outline-none resize-y selection:bg-indigo-500/40"
            placeholder="正在载入配置文件内容..."
          />
        )}
      </div>

      {/* 保存并重启二次确认 Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        title="确认保存并重启核心"
        onClose={() => setIsConfirmModalOpen(false)}
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
            >
              取消
            </button>
            <button
              onClick={handleConfirmSave}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center space-x-1"
            >
              <FileCheck size={14} />
              <span>确认写回并重启</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p>您即将覆盖目标文件内容：</p>
          <div className="font-mono text-[11px] p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 break-all">
            {currentPath}
          </div>
          {jsonSyntaxStatus && !jsonSyntaxStatus.valid && (
            <div className="text-rose-500 text-[11px] font-bold p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
              ⚠️ 检测到 JSON 语法不合法：{jsonSyntaxStatus.error}。强行保存将导致服务无法启动！
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            写回成功后，系统将自动发起 <code>box.service restart</code>，服务将经历约 1-3 秒的重载过程。
          </p>
        </div>
      </Modal>
    </div>
  );
}
