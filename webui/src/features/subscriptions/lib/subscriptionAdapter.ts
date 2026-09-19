/**
 * 订阅适配与应用引擎
 * 负责将不同格式（sing-box JSON、Clash YAML、节点链接）的订阅解析并融合为模块核心的活跃工作配置，
 * 确保透明代理转发（TPROXY 端口 1536）、Clash API 控制面板（端口 9090）和 DNS 劫持正常工作。
 */

import { boxBridge } from '@/lib/bridge';
import { parseSubscriptionContent, type ProxyNode } from './subscriptionParser';

/** 将 UTF-8 字符串转换为 Base64 编码（安全支持中文及 Emoji） */
export function encodeBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binStr = '';
  for (let i = 0; i < bytes.length; i++) {
    binStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binStr);
}

/** box4magisk 专用的标准 sing-box 1.14 透明代理入站列表 */
const SINGBOX_STANDARD_INBOUNDS = [
  {
    type: 'mixed',
    tag: 'mixed-in',
    listen: '127.0.0.1',
    listen_port: 7080,
  },
  {
    type: 'tproxy',
    tag: 'tproxy-in',
    listen: '::',
    listen_port: 1536,
  },
  {
    type: 'redirect',
    tag: 'redirect-in',
    listen: '::',
    listen_port: 7891,
  },
];

/** 生成基础骨架 sing-box 配置（当订阅为 Clash 或 URI 节点列表时使用） */
function generateSingBoxBaseConfig(outbounds: any[]) {
  const proxyTags = outbounds.map(o => o.tag).filter(t => t && t !== 'direct' && t !== 'block');

  const selectorGroup = {
    tag: 'Proxy',
    type: 'selector',
    outbounds: proxyTags.length > 0 ? proxyTags : ['direct'],
    default: proxyTags.length > 0 ? proxyTags[0] : 'direct',
    interrupt_exist_connections: true,
  };

  return {
    log: {
      disabled: false,
      level: 'info',
      output: 'sing-box.log',
      timestamp: true,
    },
    dns: {
      servers: [
        { tag: 'dns-remote', type: 'https', server: '1.1.1.1', server_port: 443 },
        { tag: 'dns-direct', type: 'https', server: '223.6.6.6', server_port: 443 },
        { tag: 'dns-local', type: 'udp', server: '223.5.5.5', server_port: 53 },
        { tag: 'dns-fakeip', type: 'fakeip', inet4_range: '198.18.0.0/15', inet6_range: 'fc00::/18' },
      ],
      rules: [
        { clash_mode: 'Direct', server: 'dns-direct' },
        { clash_mode: 'Global', server: 'dns-fakeip' },
        { rule_set: ['geosite-cn'], server: 'dns-direct' },
        { query_type: ['A', 'AAAA'], server: 'dns-fakeip' },
      ],
      strategy: 'prefer_ipv4',
    },
    inbounds: SINGBOX_STANDARD_INBOUNDS,
    outbounds: [
      selectorGroup,
      ...outbounds,
      { tag: 'direct', type: 'direct' },
      { tag: 'block', type: 'block' },
    ],
    route: {
      default_domain_resolver: 'dns-direct',
      rule_set: [
        {
          tag: 'geosite-cn',
          type: 'remote',
          format: 'binary',
          url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geosite/cn.srs',
          download_detour: 'Proxy',
          update_interval: '7d',
        },
        {
          tag: 'geoip-cn',
          type: 'remote',
          format: 'binary',
          url: 'https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo/geoip/cn.srs',
          download_detour: 'Proxy',
          update_interval: '7d',
        },
      ],
      rules: [
        { protocol: 'dns', action: 'hijack-dns' },
        { port: 53, action: 'hijack-dns' },
        { clash_mode: 'Direct', outbound: 'direct' },
        { clash_mode: 'Global', outbound: 'Proxy' },
        { ip_is_private: true, outbound: 'direct' },
        { rule_set: ['geosite-cn', 'geoip-cn'], outbound: 'direct' },
      ],
      find_process: true,
      auto_detect_interface: true,
      final: 'Proxy',
    },
    experimental: {
      cache_file: {
        enabled: true,
        store_fakeip: true,
      },
      clash_api: {
        external_controller: '127.0.0.1:9090',
        external_ui: 'ui',
        secret: '',
        default_mode: 'Rule',
      },
    },
  };
}

/** 将通用节点转换为 sing-box 出站格式 */
function convertNodeToSingBoxOutbound(node: ProxyNode): any | null {
  const port = typeof node.port === 'string' ? parseInt(node.port, 10) : node.port;
  if (!node.server || !port) return null;

  switch (node.type.toLowerCase()) {
    case 'ss':
    case 'shadowsocks':
      return {
        type: 'shadowsocks',
        tag: node.name,
        server: node.server,
        server_port: port,
        method: 'aes-128-gcm',
        password: 'password',
      };
    case 'vmess':
      return {
        type: 'vmess',
        tag: node.name,
        server: node.server,
        server_port: port,
        uuid: '00000000-0000-0000-0000-000000000000',
        security: 'auto',
      };
    case 'vless':
      return {
        type: 'vless',
        tag: node.name,
        server: node.server,
        server_port: port,
        uuid: '00000000-0000-0000-0000-000000000000',
      };
    case 'trojan':
      return {
        type: 'trojan',
        tag: node.name,
        server: node.server,
        server_port: port,
        password: 'password',
      };
    default:
      return null;
  }
}

/**
 * 核心适配函数：将指定订阅的内容转换为核心需要的完整配置并写入磁盘，
 * 然后触发核心服务与透明代理重启以使节点完全生效。
 */
export async function applySubscriptionConfig(
  name: string,
  binName: string,
  rawContent: string
): Promise<{ success: boolean; message?: string }> {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    throw new Error('订阅内容为空，无法应用');
  }

  // 1. 处理 sing-box 核心
  if (binName === 'sing-box') {
    let finalConfig: any = null;

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          finalConfig = parsed;
        }
      } catch {
        finalConfig = null;
      }
    }

    if (finalConfig) {
      // 订阅本身就是 sing-box JSON：融合必要的基础模块参数
      // 替换入站规则为 box4magisk 标准透明代理入站（去除 tun-in 等冲突入站）
      finalConfig.inbounds = SINGBOX_STANDARD_INBOUNDS;

      // 确保 Clash API 面板可访问
      finalConfig.experimental = {
        ...(finalConfig.experimental || {}),
        cache_file: {
          enabled: true,
          store_fakeip: true,
          ...(finalConfig.experimental?.cache_file || {}),
        },
        clash_api: {
          external_controller: '127.0.0.1:9090',
          external_ui: 'ui',
          secret: '',
          default_mode: 'Rule',
          ...(finalConfig.experimental?.clash_api || {}),
        },
      };

      // 统一日志格式
      finalConfig.log = {
        disabled: false,
        level: 'info',
        output: 'sing-box.log',
        timestamp: true,
        ...(finalConfig.log || {}),
      };

      // 确保路由规则包含必要的 sniff 和 DNS 劫持规则
      if (finalConfig.route) {
        finalConfig.route.auto_detect_interface = true;
        const currentRules = Array.isArray(finalConfig.route.rules) ? finalConfig.route.rules : [];

        // 必须为所有标准入站添加 sniff 规则，否则 tproxy 流量无法识别域名，
        // 会直接 fallback 到 final outbound（通常是直连），导致无法访问被墙网站
        const STANDARD_INBOUND_TAGS = ['mixed-in', 'tproxy-in', 'redirect-in'];
        const sniffedInbounds = new Set(
          currentRules
            .filter((r: any) => r.action === 'sniff')
            .flatMap((r: any) => (typeof r.inbound === 'string' ? [r.inbound] : Array.isArray(r.inbound) ? r.inbound : []))
        );
        const missingSniffRules = STANDARD_INBOUND_TAGS
          .filter(tag => !sniffedInbounds.has(tag))
          .map(tag => ({ inbound: tag, action: 'sniff', timeout: '300ms' }));

        // 移除引用已被替换入站（如 tun-in）的 sniff 规则
        const validRules = currentRules.filter((r: any) => {
          if (r.action === 'sniff' && typeof r.inbound === 'string') {
            return STANDARD_INBOUND_TAGS.includes(r.inbound);
          }
          return true;
        });

        // 确保 DNS 劫持规则存在
        const hasDnsHijack = validRules.some((r: any) => r.action === 'hijack-dns');
        const dnsHijackRules = hasDnsHijack ? [] : [
          { protocol: 'dns', action: 'hijack-dns' },
          { port: 53, action: 'hijack-dns' },
        ];

        // 最终顺序：sniff 规则 → DNS 劫持 → 其他路由规则
        finalConfig.route.rules = [
          ...missingSniffRules,
          ...dnsHijackRules,
          ...validRules,
        ];
      }

      // 清理已废弃的 DNS 选项（避免 1.14 报废弃警告）
      if (finalConfig.dns && 'independent_cache' in finalConfig.dns) {
        delete finalConfig.dns.independent_cache;
      }
    } else {
      // 订阅为 Clash YAML 或 Base64 链接列表：提取节点并构建 sing-box 完整配置
      const parsedSub = parseSubscriptionContent(rawContent);
      const generatedOutbounds = parsedSub.nodes
        .map(convertNodeToSingBoxOutbound)
        .filter((o): o is any => o !== null);

      if (generatedOutbounds.length === 0) {
        throw new Error('未能在订阅中解析出有效代理节点');
      }

      finalConfig = generateSingBoxBaseConfig(generatedOutbounds);
    }

    // 写入活跃配置文件
    const configPath = `/data/adb/box/sing-box/config.json`;
    const jsonStr = JSON.stringify(finalConfig, null, 2);
    const b64 = encodeBase64Utf8(jsonStr);
    await boxBridge.writeFile(configPath, b64);
  } else if (binName === 'mihomo' || binName === 'clash') {
    // 2. 处理 Mihomo / Clash 核心
    let yamlContent = rawContent;

    // 确保包含 box4magisk 透明代理端口与控制端口声明
    const requiredHeaders: string[] = [];
    if (!/^tproxy-port:/m.test(yamlContent)) requiredHeaders.push('tproxy-port: 1536');
    if (!/^mixed-port:/m.test(yamlContent)) requiredHeaders.push('mixed-port: 7080');
    if (!/^external-controller:/m.test(yamlContent)) requiredHeaders.push('external-controller: 127.0.0.1:9090');
    if (!/^secret:/m.test(yamlContent)) requiredHeaders.push('secret: ""');

    if (requiredHeaders.length > 0) {
      yamlContent = `${requiredHeaders.join('\n')}\n${yamlContent}`;
    }

    const configPath = `/data/adb/box/${binName}/config.yaml`;
    const b64 = encodeBase64Utf8(yamlContent);
    await boxBridge.writeFile(configPath, b64);
  } else {
    throw new Error(`当前核心 ${binName} 暂不支持自动应用订阅`);
  }

  // 3. 在元数据中标记该订阅为 active:true
  await boxBridge.subscriptionApply(name);

  // 4. 重启核心服务和透明代理，确保配置与规则生效
  await boxBridge.service('restart');
  await boxBridge.tproxy('restart');

  return { success: true };
}
