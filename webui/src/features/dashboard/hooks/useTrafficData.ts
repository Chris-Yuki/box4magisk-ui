import { useEffect, useRef, useState } from 'react';
import { ClashClient } from '@/lib/clash';
import type { TrafficStats } from '@/types/box';

interface TrafficStatusOptions {
  running: boolean;
  clash_api_port: string;
  clash_api_secret: string;
}

/**
 * 通过 Clash WebSocket /traffic 获取实时流量数据
 * 服务未运行时返回 null，组件卸载时自动断开连接
 */
export function useTrafficData(status: TrafficStatusOptions): TrafficStats | null {
  const [stats, setStats] = useState<TrafficStats | null>(null);
  // 用 ref 累计总量，避免闭包捕获旧 state
  const totalRef = useRef({ upload: 0, download: 0 });

  useEffect(() => {
    if (!status.running) {
      setStats(null);
      totalRef.current = { upload: 0, download: 0 };
      return;
    }

    const client = new ClashClient(
      status.clash_api_port || '9090',
      status.clash_api_secret || '',
    );

    // 订阅流量 WebSocket，返回取消订阅函数
    const unsubscribe = client.subscribeTraffic(
      (data) => {
        totalRef.current.upload += data.up;
        totalRef.current.download += data.down;
        setStats({
          uploadSpeed: data.up,
          downloadSpeed: data.down,
          totalUpload: totalRef.current.upload,
          totalDownload: totalRef.current.download,
        });
      },
      () => {
        // WebSocket 出错时重置为 null，等待下次 effect 重连
        setStats(null);
      },
    );

    return () => {
      unsubscribe();
      // 重置累计量，下次重新连接时从 0 开始
      totalRef.current = { upload: 0, download: 0 };
    };
  }, [status.running, status.clash_api_port, status.clash_api_secret]);

  return stats;
}
