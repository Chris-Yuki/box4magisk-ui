import { useState, useEffect, useCallback, useRef } from 'react';
import { ClashClient, type ConnectionItem, type ClashConnections } from '@/lib/clash';

// 支持连接管理的核心
const SUPPORTED_CORES = ['mihomo', 'clash', 'sing-box'];

interface UseConnectionsStatus {
  running: boolean;
  clash_api_port: string;
  clash_api_secret: string;
  bin_name: string;
}

export function useConnections(status: UseConnectionsStatus) {
  const isSupported = SUPPORTED_CORES.includes(status.bin_name);

  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [totalDownload, setTotalDownload] = useState(0);
  const [totalUpload, setTotalUpload] = useState(0);
  const [loading, setLoading] = useState(false);

  // 用 ref 保存 client，避免不必要的重建
  const clientRef = useRef<ClashClient | null>(null);

  useEffect(() => {
    if (!status.running || !isSupported) {
      setConnections([]);
      return;
    }

    clientRef.current = new ClashClient(status.clash_api_port, status.clash_api_secret);

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function fetchConnections() {
      if (!clientRef.current) return;
      try {
        const data: ClashConnections = await clientRef.current.getConnections();
        if (cancelled) return;
        setConnections(data.connections ?? []);
        setTotalDownload(data.downloadTotal);
        setTotalUpload(data.uploadTotal);
      } catch {
        if (!cancelled) setConnections([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    void fetchConnections();
    // 每 3 秒轮询一次
    timer = setInterval(() => { void fetchConnections(); }, 3000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [status.running, status.clash_api_port, status.clash_api_secret, isSupported]);

  // 关闭单条连接
  const closeConnection = useCallback(async (id: string) => {
    if (!clientRef.current) return;
    try {
      await clientRef.current.closeConnection(id);
      // 立即从本地列表移除，不等轮询
      setConnections(prev => prev.filter(c => c.id !== id));
    } catch {
      // 忽略失败
    }
  }, []);

  // 关闭所有连接
  const closeAllConnections = useCallback(async () => {
    if (!clientRef.current) return;
    try {
      await clientRef.current.closeAllConnections();
      setConnections([]);
    } catch {
      // 忽略失败
    }
  }, []);

  return {
    connections,
    loading,
    totalDownload,
    totalUpload,
    isSupported,
    closeConnection,
    closeAllConnections,
  };
}
