import { useState, useEffect, useCallback } from 'react';
import { boxBridge, notify } from '@/lib/bridge';
import type { Subscription } from '../types';
import {
  decodeBase64Utf8,
  parseSubscriptionContent,
  type ParsedSubscription,
} from '../lib/subscriptionParser';
import { applySubscriptionConfig } from '../lib/subscriptionAdapter';

// 支持通过文件/Provider下载管理订阅的核心
const SUPPORTED_CORES = ['mihomo', 'clash', 'sing-box'];

export function useSubscriptions(binName: string) {
  const isSupported = SUPPORTED_CORES.includes(binName);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingName, setUpdatingName] = useState<string | null>(null);
  const [applyingName, setApplyingName] = useState<string | null>(null);

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

  // 启用并应用指定订阅到核心活跃配置
  const applySubscription = async (name: string) => {
    setApplyingName(name);
    try {
      notify(`正在启用订阅「${name}」并配置核心...`);
      const nodeRes = await boxBridge.subscriptionNodes(name);
      const rawText = decodeBase64Utf8(nodeRes.content_b64 || '');
      await applySubscriptionConfig(name, binName, rawText);
      notify(`订阅「${name}」已成功启用并重启核心！`);
      await fetchSubscriptions();
      return true;
    } catch (e) {
      notify(`启用订阅失败: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      setApplyingName(null);
    }
  };

  // 添加新订阅，支持下载完成后立即启用
  const addSubscription = async (name: string, url: string, autoApply = true) => {
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

      if (autoApply) {
        await applySubscription(name.trim());
      } else {
        await fetchSubscriptions();
      }
      return true;
    } catch (e) {
      notify(`添加订阅失败: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };

  // 更新已有订阅：如果该订阅是当前生效中的订阅，则重新应用最新配置并重启核心
  const updateSubscription = async (name: string) => {
    setUpdatingName(name);
    try {
      notify(`正在重新下载「${name}」...`);
      await boxBridge.subscriptionUpdate(name);

      // 判断该订阅是否为当前正生效的订阅
      const targetSub = subscriptions.find(s => s.name === name);
      if (targetSub?.active) {
        notify(`检测到「${name}」为生效订阅，正在自动重新应用最新节点...`);
        const nodeRes = await boxBridge.subscriptionNodes(name);
        const rawText = decodeBase64Utf8(nodeRes.content_b64 || '');
        await applySubscriptionConfig(name, binName, rawText);
        notify(`订阅「${name}」更新完成，最新节点已重新生效！`);
      } else {
        notify(`订阅「${name}」更新完成`);
      }
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
    applyingName,
    isSupported,
    refresh: fetchSubscriptions,
    addSubscription,
    applySubscription,
    updateSubscription,
    removeSubscription,
    fetchSubscriptionNodes,
  };
}

