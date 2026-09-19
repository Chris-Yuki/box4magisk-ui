/**
 * 订阅内容解析器
 * 支持解析 sing-box (JSON)、Clash (YAML)、以及 Base64/URI 节点链接列表
 */

export interface ProxyNode {
  name: string;
  type: string;
  server?: string;
  port?: number | string;
  details?: string;
}

export interface ProxyGroup {
  name: string;
  type: string;
  proxiesCount?: number;
  proxies?: string[];
}

export interface ParsedSubscription {
  format: 'sing-box' | 'clash' | 'uri-list' | 'unknown';
  nodes: ProxyNode[];
  groups: ProxyGroup[];
  rawText: string;
}

/** UTF-8 Base64 安全解码 */
export function decodeBase64Utf8(b64: string): string {
  try {
    const cleanB64 = b64.replace(/\s+/g, '');
    const binStr = atob(cleanB64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      return atob(b64.replace(/\s+/g, ''));
    } catch {
      return b64;
    }
  }
}

/** 解析 Clash YAML 格式的节点 */
function parseClashYaml(text: string): { nodes: ProxyNode[]; groups: ProxyGroup[] } {
  const nodes: ProxyNode[] = [];
  const groups: ProxyGroup[] = [];

  const lines = text.split(/\r?\n/);
  let section: 'none' | 'proxies' | 'groups' = 'none';
  let currentProxy: Partial<ProxyNode> | null = null;
  let currentGroup: { name: string; type: string; proxies: string[] } | null = null;

  const pushCurrentProxy = () => {
    if (currentProxy && currentProxy.name && currentProxy.type) {
      nodes.push({
        name: currentProxy.name,
        type: currentProxy.type,
        server: currentProxy.server || '',
        port: currentProxy.port || '',
        details: currentProxy.details || '',
      });
    }
    currentProxy = null;
  };

  const pushCurrentGroup = () => {
    if (currentGroup && currentGroup.name) {
      groups.push({
        name: currentGroup.name,
        type: currentGroup.type || 'select',
        proxiesCount: currentGroup.proxies.length,
        proxies: currentGroup.proxies,
      });
    }
    currentGroup = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (/^proxies\s*:/i.test(line)) {
      pushCurrentProxy();
      pushCurrentGroup();
      section = 'proxies';
      continue;
    }
    if (/^proxy-groups\s*:/i.test(line)) {
      pushCurrentProxy();
      pushCurrentGroup();
      section = 'groups';
      continue;
    }
    if (/^[a-zA-Z0-9_-]+\s*:/i.test(line) && !line.startsWith('-')) {
      // 进入其他非 proxies/proxy-groups 顶级块
      pushCurrentProxy();
      pushCurrentGroup();
      section = 'none';
      continue;
    }

    if (section === 'proxies') {
      // 检查行内 JSON 风格: - { name: "...", type: ss, server: ..., port: 1234 }
      if (line.startsWith('-') && line.includes('{') && line.includes('}')) {
        pushCurrentProxy();
        const inner = line.slice(line.indexOf('{') + 1, line.lastIndexOf('}'));
        const nameMatch = inner.match(/name\s*:\s*["']?([^"',}]+)["']?/i);
        const typeMatch = inner.match(/type\s*:\s*["']?([^"',}]+)["']?/i);
        const serverMatch = inner.match(/server\s*:\s*["']?([^"',}]+)["']?/i);
        const portMatch = inner.match(/port\s*:\s*(\d+)/i);
        if (nameMatch && typeMatch) {
          nodes.push({
            name: nameMatch[1].trim(),
            type: typeMatch[1].trim(),
            server: serverMatch ? serverMatch[1].trim() : '',
            port: portMatch ? portMatch[1] : '',
          });
        }
        continue;
      }

      // 普通列表项开始
      if (line.startsWith('-')) {
        pushCurrentProxy();
        currentProxy = {};
        const content = line.slice(1).trim();
        const nameMatch = content.match(/^name\s*:\s*["']?(.*?)["']?$/i);
        if (nameMatch) currentProxy.name = nameMatch[1].trim();
      } else if (currentProxy) {
        const nameMatch = line.match(/^name\s*:\s*["']?(.*?)["']?$/i);
        const typeMatch = line.match(/^type\s*:\s*["']?(.*?)["']?$/i);
        const serverMatch = line.match(/^server\s*:\s*["']?(.*?)["']?$/i);
        const portMatch = line.match(/^port\s*:\s*(\d+)/i);
        const networkMatch = line.match(/^network\s*:\s*["']?(.*?)["']?$/i);
        const tlsMatch = line.match(/^tls\s*:\s*(true|1)/i);

        if (nameMatch) currentProxy.name = nameMatch[1].trim();
        if (typeMatch) currentProxy.type = typeMatch[1].trim();
        if (serverMatch) currentProxy.server = serverMatch[1].trim();
        if (portMatch) currentProxy.port = portMatch[1];
        if (networkMatch || tlsMatch) {
          const parts = [];
          if (networkMatch) parts.push(networkMatch[1]);
          if (tlsMatch) parts.push('TLS');
          currentProxy.details = parts.join(' · ');
        }
      }
    } else if (section === 'groups') {
      if (line.startsWith('-')) {
        pushCurrentGroup();
        currentGroup = { name: '', type: 'select', proxies: [] };
        const content = line.slice(1).trim();
        const nameMatch = content.match(/^name\s*:\s*["']?(.*?)["']?$/i);
        if (nameMatch) currentGroup.name = nameMatch[1].trim();
      } else if (currentGroup) {
        const nameMatch = line.match(/^name\s*:\s*["']?(.*?)["']?$/i);
        const typeMatch = line.match(/^type\s*:\s*["']?(.*?)["']?$/i);
        if (nameMatch) currentGroup.name = nameMatch[1].trim();
        if (typeMatch) currentGroup.type = typeMatch[1].trim();
        if (line.startsWith('-') && currentGroup.name) {
          currentGroup.proxies.push(line.slice(1).trim());
        }
      }
    }
  }

  pushCurrentProxy();
  pushCurrentGroup();

  return { nodes, groups };
}

/** 解析 URI 链接列表（如 vmess://, vless://, ss:// 等） */
function parseUriList(text: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const protoMatch = line.match(/^([a-zA-Z0-9_-]+):\/\//);
    if (!protoMatch) continue;
    const proto = protoMatch[1].toLowerCase();

    let name = '';
    let server = '';
    let port = '';

    // 尝试从 # 提取节点名称
    const hashIndex = line.indexOf('#');
    if (hashIndex !== -1) {
      try {
        name = decodeURIComponent(line.slice(hashIndex + 1));
      } catch {
        name = line.slice(hashIndex + 1);
      }
    }

    if (proto === 'vmess') {
      try {
        const b64Part = line.slice('vmess://'.length).split('#')[0];
        const vmessObj = JSON.parse(decodeBase64Utf8(b64Part));
        if (vmessObj.ps && !name) name = vmessObj.ps;
        server = vmessObj.add || '';
        port = vmessObj.port || '';
      } catch {}
    } else {
      // 通用 URL 格式提取 host:port
      const withoutProto = line.slice(protoMatch[0].length).split('#')[0];
      const hostPart = withoutProto.includes('@') ? withoutProto.split('@')[1] : withoutProto;
      const hostPortMatch = hostPart.match(/^\[?([a-zA-Z0-9_.-]+)\]?:(\d+)/);
      if (hostPortMatch) {
        server = hostPortMatch[1];
        port = hostPortMatch[2];
      }
    }

    nodes.push({
      name: name || `${proto.toUpperCase()} Node`,
      type: proto,
      server,
      port,
    });
  }

  return nodes;
}

/** 主解析入口 */
export function parseSubscriptionContent(rawText: string): ParsedSubscription {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { format: 'unknown', nodes: [], groups: [], rawText };
  }

  // 1. 尝试作为 sing-box JSON 配置解析
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (Array.isArray(obj.outbounds)) {
        const nodes: ProxyNode[] = [];
        const groups: ProxyGroup[] = [];

        for (const o of obj.outbounds) {
          if (!o || typeof o !== 'object') continue;
          const type = String(o.type || '').toLowerCase();

          if (['selector', 'urltest'].includes(type)) {
            groups.push({
              name: o.tag || type,
              type,
              proxiesCount: Array.isArray(o.outbounds) ? o.outbounds.length : 0,
              proxies: o.outbounds || [],
            });
          } else if (['direct', 'block', 'dns'].includes(type)) {
            // 系统出站跳过
          } else {
            const details: string[] = [];
            if (o.network) details.push(String(o.network));
            if (o.tls?.enabled) {
              details.push(o.tls.reality?.enabled ? 'Reality' : 'TLS');
            }
            if (o.transport?.type) details.push(String(o.transport.type));

            nodes.push({
              name: o.tag || `${type.toUpperCase()} Node`,
              type,
              server: o.server || '',
              port: o.server_port || '',
              details: details.join(' · '),
            });
          }
        }

        return {
          format: 'sing-box',
          nodes,
          groups,
          rawText,
        };
      }
    } catch {}
  }

  // 2. 尝试作为 Clash YAML 解析
  if (trimmed.includes('proxies:') || trimmed.includes('proxy-groups:')) {
    const { nodes, groups } = parseClashYaml(trimmed);
    if (nodes.length > 0 || groups.length > 0) {
      return {
        format: 'clash',
        nodes,
        groups,
        rawText,
      };
    }
  }

  // 3. 尝试作为 URI 链接列表解析
  const uriNodes = parseUriList(trimmed);
  if (uriNodes.length > 0) {
    return {
      format: 'uri-list',
      nodes: uriNodes,
      groups: [],
      rawText,
    };
  }

  // 4. 尝试对可能整段进行了 Base64 编码的内容二次解码
  try {
    const decoded = decodeBase64Utf8(trimmed);
    if (decoded && decoded !== trimmed) {
      const secondTry = parseSubscriptionContent(decoded);
      if (secondTry.format !== 'unknown') {
        return secondTry;
      }
    }
  } catch {}

  return {
    format: 'unknown',
    nodes: [],
    groups: [],
    rawText,
  };
}
