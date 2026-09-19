import { exec, getPackagesInfo, listPackages, toast } from "kernelsu";
import type { AppInfo } from '@/types/box';

// ── 后端脚本路径 ──────────────────────────────────────────────────────────────
const BRIDGE_RELATIVE_PATH = "/data/adb/box/scripts/box.webui";

// ── 平台检测 ──────────────────────────────────────────────────────────────────
// 运行时探测当前环境，支持 KSU 原生、MMRL（Magisk）和浏览器 mock 三种模式
type Platform = 'ksu' | 'mmrl' | 'mock';

function detectPlatform(): Platform {
  // KSU 原生 WebUI：kernelsu npm 包注入了 exec 函数
  if (typeof exec === 'function') return 'ksu';
  // MMRL（Magisk 模块管理器）：通过全局 $ksu 或 ksu 对象提供 bridge
  if (typeof (globalThis as any).$ksu?.exec === 'function') return 'mmrl';
  if (typeof (globalThis as any).ksu?.exec === 'function') return 'mmrl';
  // 其他（浏览器直接打开）：使用 mock 数据，方便本地开发调试
  return 'mock';
}

/** 当前运行平台，可在 UI 层展示 */
export const platform: Platform = detectPlatform();

// ── 平台统一执行函数 ──────────────────────────────────────────────────────────
/** 统一调用底层 exec，屏蔽 KSU 和 MMRL 的接口差异 */
async function platformExec(command: string): Promise<{ stdout: string; stderr: string }> {
  if (platform === 'ksu') {
    // KSU 原生
    const result = await exec(command);
    return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
  }
  if (platform === 'mmrl') {
    // MMRL bridge（Magisk 环境）
    const ksu = (globalThis as any).$ksu ?? (globalThis as any).ksu;
    const result = await ksu.exec(command);
    return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
  }
  // mock 模式（浏览器调试）：不执行实际命令
  throw new Error('mock-exec');
}

// ── Mock 数据 ─────────────────────────────────────────────────────────────────
// 在浏览器环境下运行时返回的预设数据，用于本地 UI 开发调试
const MOCK_RESPONSES: Record<string, any> = {
  status: {
    running: true, pid: '1234', bin_name: 'mihomo',
    proxy_mode: 1, clash_api_port: '9090', clash_api_secret: '',
    box_config_file: '/data/adb/box/scripts/box.config',
    tproxy_config_file: '/data/adb/box/scripts/tproxy.conf',
    module_root: '/data/adb/modules/box4',
    manual_mode: false, module_disabled: false,
    autostart_enabled: true, transparent_proxy_running: true,
  },
  'get-config': {
    bin_name: 'mihomo', PROXY_MODE: 1, PROXY_MOBILE: 1, PROXY_WIFI: 1,
    PROXY_HOTSPOT: 0, PROXY_USB: 0, PROXY_TCP: 1, PROXY_UDP: 1,
    PROXY_IPV6: 0, APP_PROXY_ENABLE: 0, APP_PROXY_MODE: 'blacklist',
    PROXY_APPS_LIST: '', BYPASS_APPS_LIST: '', BYPASS_CN_IP: 0,
    BLOCK_QUIC: 1, MAC_FILTER_ENABLE: 0, DNS_HIJACK_ENABLE: 1,
    DNS_PORT: '1053', clash_api_port: 9090, clash_api_secret: '',
    PERFORMANCE_MODE: 0, FORCE_MARK_BYPASS: 0,
  },
  'check-log': {
    path: '/data/adb/box/run/check.log', exists: true, lines: 50,
    content: [
      '2024-01-01 12:00:00 [Info] mihomo started, pid: 1234',
      '2024-01-01 12:00:01 [Info] tproxy rules applied',
      '2024-01-01 12:01:00 [Info] connection established: google.com:443',
      '2024-01-01 12:02:00 [Warn] slow connection detected',
      '2024-01-01 12:03:00 [Error] failed to connect: example.com',
    ].join('\n'),
  },
  'clear-log': { cleared: true },
  'subscription-list': [],
  capabilities: {
    commands: { ipset: true },
    kernel: { config_gz: true, tproxy: true, ip_set: true, xt_set: true },
    features: {
      BYPASS_CN_IP: { available: true, reason: 'ok' },
      TPROXY: { available: true, reason: 'ok' },
    },
  },
};

function getMockResponse(command: string, _args: string[]): any {
  const base = command;
  if (base in MOCK_RESPONSES) return MOCK_RESPONSES[base];
  // 默认成功响应
  return { ok: true };
}

// ── JSON 提取 ─────────────────────────────────────────────────────────────────
function shellQuote(value: string) {
  return `'${value.split("'").join(`'\\''`)}'`;
}

function extractJson(stdout: string, stderr: string) {
  const source = [stdout, stderr].filter(Boolean).join("\n").trim();
  if (!source) throw new Error("box.webui returned no output");

  // 1. 优先尝试直接解析完整输出（支持含换行的多行 JSON）
  try {
    JSON.parse(source);
    return source;
  } catch {}

  // 2. 查找首尾大括号截取（过滤输出前后的杂质日志或 shell 打印）
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = source.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {}
  }

  // 3. 单行倒序扫描兜底
  const lines = source.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const start = line.indexOf("{");
    const end = line.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    const candidate = line.slice(start, end + 1);
    try { JSON.parse(candidate); return candidate; } catch { }
  }
  throw new Error(source || "box.webui returned no JSON payload");
}

// ── 统一 API 调用 ─────────────────────────────────────────────────────────────
async function runApi<T = any>(args: string[]): Promise<T> {
  const [command, ...rest] = args;

  // mock 模式直接返回预设数据
  if (platform === 'mock') {
    await new Promise(resolve => setTimeout(resolve, 80)); // 模拟网络延迟
    return getMockResponse(command, rest) as T;
  }

  const cmd = `${shellQuote(BRIDGE_RELATIVE_PATH)} ${args.map(shellQuote).join(" ")}`;
  const result = await platformExec(cmd);
  const payload = JSON.parse(
    extractJson(String(result.stdout ?? ""), String(result.stderr ?? ""))
  ) as any;
  if (!payload.ok) {
    throw new Error(payload.error || `${payload.command} failed`);
  }
  return payload.data as T;
}

// ── boxBridge API ─────────────────────────────────────────────────────────────
/** 封装所有与 box.webui 后端脚本的通信 */
export const boxBridge = {
  // 基础
  status: () => runApi(['status']),
  getConfig: () => runApi(['get-config']),
  capabilities: () => runApi(['capabilities']),

  // 配置写入
  setNumber: (key: string, value: number | string) => runApi(['set-number', key, String(value)]),
  toggle: (key: string, value: 0 | 1) => runApi(['toggle', key, String(value)]),
  setConfig: (key: string, value: string) => runApi(['set-config', key, value]),

  // 服务控制
  service: (action: 'start' | 'stop' | 'restart' | 'status') => runApi(['service', action]),
  tproxy: (action: 'start' | 'stop' | 'restart' | 'status') => runApi(['tproxy', action]),
  manualMode: (action: 'status' | 'enable' | 'disable') => runApi(['manual-mode', action]),

  // 日志
  checkLog: (lines: number = 80) => runApi(['check-log', String(lines)]),
  /** 清空日志文件（磁盘级别） */
  clearLog: () => runApi(['clear-log']),

  // 文件读写（用于配置文件编辑）
  /** 读取文件，返回 base64 编码的内容 */
  readFile: (path: string) => runApi<{ path: string; size: number; content_b64: string }>(['read-file', path]),
  /** 将 base64 内容写回文件 */
  writeFile: (path: string, contentB64: string) => runApi<{ path: string; size: number }>(['write-file', path, contentB64]),

  // 应用分流
  apps: () => runApi(['apps']),
  setApps: (mode: 'whitelist' | 'blacklist' | 'disable', value = '') => runApi(['set-apps', mode, value]),

  // 订阅管理
  /** 列出当前核心的所有订阅 */
  subscriptionList: () => runApi<any[]>(['subscription-list']),
  /** 添加订阅（下载并保存元数据） */
  subscriptionAdd: (name: string, url: string) => runApi(['subscription-add', name, url]),
  /** 重新下载更新已有订阅 */
  subscriptionUpdate: (name: string) => runApi(['subscription-update', name]),
  /** 删除订阅及其文件 */
  subscriptionRemove: (name: string) => runApi(['subscription-remove', name]),

  // 工具
  mihomoPanel: () => runApi(['mihomo-panel-url']),
  downloadCores: () => runApi(['download-cores']),
};

// ── 打开外部 URL ──────────────────────────────────────────────────────────────
export async function openExternalUrl(url: string) {
  if (platform === 'mock') {
    window.open(url, '_blank');
    return;
  }
  const command = `am start -a android.intent.action.VIEW -d ${shellQuote(url)}`;
  const result = await platformExec(command);
  const stderr = String(result.stderr ?? '').trim();
  if (stderr && !/Starting: Intent/i.test(stderr)) {
    throw new Error(stderr);
  }
}

// ── 应用包列表 ────────────────────────────────────────────────────────────────
export async function discoverPackages(): Promise<AppInfo[]> {
  // mock 模式返回空列表
  if (platform === 'mock') return [];

  try {
    const pkgs = listPackages?.('all');
    if (Array.isArray(pkgs) && pkgs.length > 0) {
      const rows = getPackagesInfo?.(pkgs.filter(v => typeof v === 'string' && v.trim().length > 0)) as Array<Partial<AppInfo> & { packageName?: string }>;
      if (Array.isArray(rows) && rows.length > 0) {
        return rows
          .filter((entry): entry is Partial<AppInfo> & { packageName: string } =>
            typeof entry === 'object' && entry !== null && typeof entry.packageName === 'string')
          .map(entry => ({
            packageName: entry.packageName,
            appLabel: (entry.appLabel?.trim() || entry.packageName),
            isSystem: Boolean(entry.isSystem),
          }))
          .sort((a, b) => {
            if (a.isSystem !== b.isSystem) return Number(a.isSystem) - Number(b.isSystem);
            return a.appLabel.localeCompare(b.appLabel, 'zh-CN');
          });
      }
    }

    // 回落：通过 pm list packages 命令获取
    const result = await platformExec("pm list packages -3 | sed 's/^package:/user:/' ; pm list packages -s | sed 's/^package:/system:/'");
    return String(result.stdout ?? '').split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => /^(user|system):/.test(line))
      .map(line => ({
        packageName: line.replace(/^(user|system):/, ''),
        appLabel: line.replace(/^(user|system):/, ''),
        isSystem: line.startsWith('system:'),
      }));
  } catch {
    return [];
  }
}

// ── 通知 Toast ────────────────────────────────────────────────────────────────
export function notify(msg: string) {
  try { toast?.(msg); } catch { /* ignore */ }
}
