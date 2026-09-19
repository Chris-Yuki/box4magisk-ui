export interface ClashConfig {
  mode: 'rule' | 'global' | 'direct';
}

export interface Proxy {
  name: string;
  type: string;
  now?: string;
  all?: string[];
  history?: { time: string; delay: number }[];
  udp: boolean;
}

export interface ProxyProvider {
  name: string;
  type: string;
  vehicleType: string;
  updatedAt: string;
  proxies: { name: string; type: string }[];
  subscriptionInfo?: {
    Download: number;
    Upload: number;
    Total: number;
    Expire: number;
  };
}

export interface ClashMemory {
  inuse?: number;
  oslimit?: number;
  [key: string]: unknown;
}

type ClashRequestOptions = Omit<RequestInit, 'body' | 'signal'> & {
  body?: any;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class ClashClient {
  private baseUrl: string;
  private secret: string;

  constructor(port: string, secret: string) {
    this.baseUrl = `http://127.0.0.1:${port}`;
    this.secret = secret;
  }

  private createAbortSignal(signal?: AbortSignal, timeoutMs = 10000): AbortSignal | undefined {
    if (typeof AbortController === 'undefined') {
      return signal;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const abortWithReason = (reason?: any) => {
      if (!controller.signal.aborted) {
        controller.abort(reason);
      }
    };

    if (signal) {
      if (signal.aborted) {
        abortWithReason(signal.reason);
      } else {
        signal.addEventListener('abort', () => abortWithReason(signal.reason), { once: true });
      }
    }

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        abortWithReason(new Error('Clash API request timeout'));
      }, timeoutMs);
      controller.signal.addEventListener('abort', () => {
        if (timeoutId) clearTimeout(timeoutId);
      }, { once: true });
    }

    return controller.signal;
  }

  private async request<T = any>(path: string, options: ClashRequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    if (this.secret) {
      headers.set('Authorization', `Bearer ${this.secret}`);
    }

    let body: any = options.body;
    if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    }

    const signal = this.createAbortSignal(options.signal, options.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers, body, signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const reason = signal?.reason;
        if (reason instanceof Error && reason.message) {
          throw reason;
        }
        throw new Error('Clash API request aborted');
      }
      throw error;
    }

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Clash API error: ${error || response.status}`);
    }

    if (response.status === 204) return null as any;
    return response.json();
  }

  async getConfig(options?: ClashRequestOptions): Promise<ClashConfig> {
    return this.request<ClashConfig>('/configs', options);
  }

  async getMemory(options?: ClashRequestOptions): Promise<ClashMemory> {
    const url = `${this.baseUrl}/memory`;
    const headers = new Headers(options?.headers || {});
    if (this.secret) {
      headers.set('Authorization', `Bearer ${this.secret}`);
    }

    const signal = this.createAbortSignal(options?.signal, options?.timeoutMs ?? 3000);
    const response = await fetch(url, { ...options, headers, signal });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Clash API error: ${error || response.status}`);
    }

    if (!response.body) {
      throw new Error('Clash API error: memory stream unavailable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let latest: ClashMemory | null = null;
    const startedAt = Date.now();
    const collectWindowMs = 350;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            latest = JSON.parse(trimmed) as ClashMemory;
          } catch {
            // ignore invalid chunks and keep reading
          }
        }

        if (latest && Date.now() - startedAt >= collectWindowMs) {
          return latest;
        }
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore reader cancellation errors
      }
    }

    const tail = buffer.trim();
    if (tail) {
      try {
        return JSON.parse(tail) as ClashMemory;
      } catch {
        // ignore trailing invalid payload
      }
    }

    throw new Error('Clash API error: invalid memory payload');
  }

  async updateConfig(config: Partial<ClashConfig>, options?: ClashRequestOptions): Promise<void> {
    await this.request('/configs', { ...options, method: 'PATCH', body: config });
  }

  async getProxies(options?: ClashRequestOptions): Promise<Record<string, Proxy>> {
    const data = await this.request<{ proxies: Record<string, Proxy> }>('/proxies', options);
    return data.proxies;
  }

  async selectProxy(groupName: string, proxyName: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/proxies/${encodeURIComponent(groupName)}`, {
      ...options,
      method: 'PUT',
      body: { name: proxyName },
    });
  }

  async getProviders(options?: ClashRequestOptions): Promise<Record<string, ProxyProvider>> {
    const data = await this.request<{ providers: Record<string, ProxyProvider> }>('/providers/proxies', options);
    return data.providers;
  }

  async updateProvider(name: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/providers/proxies/${encodeURIComponent(name)}`, { ...options, method: 'PUT' });
  }

  async healthCheckProvider(name: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/providers/proxies/${encodeURIComponent(name)}/healthcheck`, options);
  }

  async testLatency(name: string, url = 'http://www.gstatic.com/generate_204', timeout = 5000, options?: ClashRequestOptions): Promise<number> {
    const data = await this.request<{ delay: number }>(
      `/proxies/${encodeURIComponent(name)}/delay?url=${encodeURIComponent(url)}&timeout=${timeout}`,
      options
    );
    return data.delay;
  }

  // ── 活跃连接管理 ────────────────────────────────────────────────────────────

  /** 获取当前所有活跃连接的快照 */
  async getConnections(options?: ClashRequestOptions): Promise<ClashConnections> {
    return this.request<ClashConnections>('/connections', options);
  }

  /** 关闭指定 ID 的单条连接 */
  async closeConnection(id: string, options?: ClashRequestOptions): Promise<void> {
    await this.request(`/connections/${encodeURIComponent(id)}`, {
      ...options,
      method: 'DELETE',
    });
  }

  /** 关闭所有活跃连接 */
  async closeAllConnections(options?: ClashRequestOptions): Promise<void> {
    await this.request('/connections', { ...options, method: 'DELETE' });
  }

  // ── WebSocket 实时数据流 ────────────────────────────────────────────────────

  /**
   * 订阅实时流量数据（WebSocket /traffic）
   * 返回取消订阅函数，调用后断开连接
   */
  subscribeTraffic(
    callback: (data: TrafficData) => void,
    onError?: (err: Event) => void,
  ): () => void {
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    const url = this.secret
      ? `${wsBase}/traffic?token=${encodeURIComponent(this.secret)}`
      : `${wsBase}/traffic`;

    const ws = new WebSocket(url);
    let closed = false;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as TrafficData;
        if (!closed) callback(data);
      } catch { /* ignore malformed frames */ }
    };

    ws.onerror = (ev) => {
      if (!closed) onError?.(ev);
    };

    // 返回取消订阅函数
    return () => {
      closed = true;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }

  /**
   * 订阅实时连接数据（WebSocket /connections）
   * 返回取消订阅函数
   */
  subscribeConnections(
    callback: (data: ClashConnections) => void,
    onError?: (err: Event) => void,
  ): () => void {
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    const url = this.secret
      ? `${wsBase}/connections?token=${encodeURIComponent(this.secret)}`
      : `${wsBase}/connections`;

    const ws = new WebSocket(url);
    let closed = false;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as ClashConnections;
        if (!closed) callback(data);
      } catch { /* ignore malformed frames */ }
    };

    ws.onerror = (ev) => {
      if (!closed) onError?.(ev);
    };

    return () => {
      closed = true;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }
}

// ── 新增数据类型 ───────────────────────────────────────────────────────────────

/** Clash API /traffic 接口返回的流量数据 */
export interface TrafficData {
  /** 当前上行速率（字节/秒） */
  up: number;
  /** 当前下行速率（字节/秒） */
  down: number;
}

/** 单条活跃连接信息 */
export interface ConnectionItem {
  id: string;
  metadata: {
    network: string;        // tcp / udp
    type: string;           // 连接类型
    host: string;           // 目标主机名
    sourceIP: string;
    destinationIP: string;
    destinationPort: string;
    process?: string;       // 触发连接的进程名（部分核心支持）
  };
  /** 已上传字节数 */
  upload: number;
  /** 已下载字节数 */
  download: number;
  /** 连接建立时间（ISO 字符串） */
  start: string;
  /** 匹配的规则（如 DOMAIN-SUFFIX,google.com,Proxy） */
  rule: string;
  /** 匹配规则的详情 */
  rulePayload: string;
  /** 使用的代理节点名称 */
  chains: string[];
}

/** Clash API /connections 返回结构 */
export interface ClashConnections {
  downloadTotal: number;
  uploadTotal: number;
  connections: ConnectionItem[] | null;
}

