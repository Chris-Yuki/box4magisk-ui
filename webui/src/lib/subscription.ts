import { boxBridge } from './bridge';
import type { SubscriptionItem } from '@/types/box';

function base64ToUtf8(b64: string): string {
  try {
    const binString = atob(b64.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    return new TextDecoder().decode(bytes);
  } catch {
    return atob(b64);
  }
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

interface OutboundItem {
  tag: string;
  type: string;
  outbounds?: string[];
  [key: string]: unknown;
}

interface SingBoxConfig {
  inbounds?: unknown[];
  outbounds?: OutboundItem[];
  route?: {
    rules?: Array<{ [key: string]: unknown }>;
    final?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function mergeSingBoxConfig(baseConfigStr: string, remoteContentStr: string): { newConfigStr: string; nodeCount: number } {
  let baseConfig: SingBoxConfig;
  try {
    baseConfig = JSON.parse(baseConfigStr) as SingBoxConfig;
  } catch (e) {
    throw new Error(`本地 sing-box 配置解析错误: ${e instanceof Error ? e.message : String(e)}`);
  }

  let remoteJson: any;
  try {
    remoteJson = JSON.parse(remoteContentStr);
  } catch {
    throw new Error('订阅内容不是合法的 sing-box JSON 格式，请确认链接类型或使用订阅转换');
  }

  let remoteOutbounds: OutboundItem[] = [];
  if (Array.isArray(remoteJson.outbounds)) {
    remoteOutbounds = remoteJson.outbounds;
  } else if (Array.isArray(remoteJson)) {
    remoteOutbounds = remoteJson;
  } else {
    throw new Error('订阅内容未包含有效的 outbounds 节点列表');
  }

  // Filter actual proxy nodes (exclude built-in direct, block, dns, etc.)
  const systemTags = new Set(['direct', 'block', 'dns', 'dns-out', 'auto', 'Proxy']);
  const proxyNodes = remoteOutbounds.filter(
    (item): item is OutboundItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.tag === 'string' &&
      !['direct', 'block', 'dns'].includes(item.type) &&
      !systemTags.has(item.tag)
  );

  if (proxyNodes.length === 0) {
    throw new Error('订阅中未找到任何可用的代理节点');
  }

  const existingOutbounds = Array.isArray(baseConfig.outbounds) ? baseConfig.outbounds : [];
  const systemOutbounds = existingOutbounds.filter(
    (item) => item.tag === 'direct' || item.tag === 'block' || item.type === 'direct' || item.type === 'block'
  );

  if (!systemOutbounds.some((item) => item.tag === 'direct')) {
    systemOutbounds.unshift({ tag: 'direct', type: 'direct' });
  }

  const nodeTags = proxyNodes.map((n) => n.tag);

  // Proxy selector group containing all proxy nodes
  const proxySelector: OutboundItem = {
    tag: 'Proxy',
    type: 'selector',
    outbounds: nodeTags,
    interrupt_exist_connections: true,
  };

  // Merge: system outbounds + Proxy group + all proxy nodes
  baseConfig.outbounds = [...systemOutbounds, proxySelector, ...proxyNodes];

  return {
    newConfigStr: JSON.stringify(baseConfig, null, 2),
    nodeCount: proxyNodes.length,
  };
}

export async function processSubscriptionUpdate(sub: SubscriptionItem): Promise<{ nodeCount: number }> {
  // 1. Fetch remote content using root curl to bypass CORS
  const fetchResult = await boxBridge.fetchUrl(sub.url, 'sing-box');
  const remoteContent = base64ToUtf8(fetchResult.content_base64);

  // 2. Read current core config
  const coreConfigResult = await boxBridge.readCoreConfig();
  const currentConfigStr = base64ToUtf8(coreConfigResult.content_base64);

  let newConfigStr = '';
  let nodeCount = 0;

  if (coreConfigResult.bin_name === 'sing-box') {
    const merged = mergeSingBoxConfig(currentConfigStr, remoteContent);
    newConfigStr = merged.newConfigStr;
    nodeCount = merged.nodeCount;
  } else {
    // For clash/mihomo, directly save if it's yaml
    newConfigStr = remoteContent;
    nodeCount = 1;
  }

  // 3. Apply and verify new config
  const newB64 = utf8ToBase64(newConfigStr);
  await boxBridge.applyCoreConfig(newB64);

  return { nodeCount };
}
