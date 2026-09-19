import { useState, useEffect, useCallback } from 'react';
import { boxBridge, notify } from '@/lib/bridge';
import type { Subscription } from '../types';
import {
  decodeBase64Utf8,
  parseSubscriptionContent,
  type ParsedSubscription,
} from '../lib/subscriptionParser';

// 支持通过文件/Provider下载管理订阅的核心
const SUPPORTED_CORES = ['mihomo', 'clash', 'sing-box'];

export function useSubscriptions(binName: string) {
  const isSupported = SUPPORTED_CORES.includes(binName);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  // 拉取订阅列表
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await boxBridge.subscriptionList();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions, binName]);

  // 添加新订阅
  const addSubscription = async (name: string, url: string) => {
    if (!name.trim() || !url.trim()) {
      notify('名称和订阅链接不能为空');
      return false;
    }
    if (!isSupported) {
      notify(`${binName} 暂不支持自动下载订阅，请在配置文件中配置`);
      return false;
    }

    try {
      notify('正在下载订阅文件...');
      await boxBridge.subscriptionAdd(name.trim(), url.trim());
      notify(`订阅「${name}」已添加并下载成功`);
      await fetchSubscriptions();
      return true;
    } catch (e) {
      notify(`添加订阅失败: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };

  // 更新已有订阅
  const updateSubscription = async (name: string) => {
    setUpdatingName(name);
    try {
      notify(`正在更新「${name}」...`);
      await boxBridge.subscriptionUpdate(name);
      notify(`订阅「${name}」更新完成`);
      await fetchSubscriptions();
    } catch (e) {
      notify(`更新订阅失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUpdatingName(null);
    }
  };

  // 删除订阅
  const removeSubscription = async (name: string) => {
    try {
      await boxBridge.subscriptionRemove(name);
      notify(`订阅「${name}」已删除`);
      setSubscriptions(prev => prev.filter(s => s.name !== name));
      await fetchSubscriptions();
    } catch (e) {
      notify(`删除失败: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // 获取并解析订阅节点
  const fetchSubscriptionNodes = async (name: string): Promise<ParsedSubscription> => {
    const res = await boxBridge.subscriptionNodes(name);
    const rawText = decodeBase64Utf8(res.content_b64 || '');
    return parseSubscriptionContent(rawText);
  };

  return {
    subscriptions,
    loading,
    updatingName,
    isSupported,
    refresh: fetchSubscriptions,
    addSubscription,
    updateSubscription,
    removeSubscription,
    fetchSubscriptionNodes,
  };
}

