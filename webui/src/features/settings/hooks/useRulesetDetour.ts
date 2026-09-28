import { useState, useEffect, useCallback } from 'react';
import { boxBridge, notify } from '@/lib/bridge';
import type { BoxStatus } from '@/types/box';

function utf8ToBase64(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return btoa(str);
  }
}

function base64ToUtf8(b64: string): string {
  try {
    const binStr = atob(b64);
    return decodeURIComponent(
      Array.from(binStr)
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(b64);
  }
}

export interface RulesetDetourInfo {
  outbounds: string[];
  currentDetour: string;
  hasMissingDetour: boolean;
  ruleSetCount: number;
  loading: boolean;
  saving: boolean;
  updateDetour: (newDetour: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const SINGBOX_CONFIG_PATH = '/data/adb/box/sing-box/config.json';
const RULESET_CLIENT_TAG = 'ruleset-client';

export function useRulesetDetour(status: BoxStatus): RulesetDetourInfo {
  const [outbounds, setOutbounds] = useState<string[]>([]);
  const [currentDetour, setCurrentDetour] = useState<string>('');
  const [hasMissingDetour, setHasMissingDetour] = useState<boolean>(false);
  const [ruleSetCount, setRuleSetCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const isSingBox = (status?.bin_name || 'sing-box') === 'sing-box';

  const loadDetourInfo = useCallback(async () => {
    if (!isSingBox) return;
    setLoading(true);
    try {
      const res = await boxBridge.readFile(SINGBOX_CONFIG_PATH);
      if (!res || !res.content_b64) return;

      const rawJson = base64ToUtf8(res.content_b64);
      const configObj = JSON.parse(rawJson);

      // 提取可用出站
      const obList: string[] = (configObj.outbounds || [])
        .map((o: any) => o?.tag)
        .filter(Boolean);
      setOutbounds(obList);

      // 扫描 remote 规则集数量
      const ruleSets = configObj.route?.rule_set || [];
      const remoteSets = ruleSets.filter((r: any) => r?.type === 'remote');
      setRuleSetCount(remoteSets.length);

      // 1. 优先从 sing-box 1.14+ 现代标准 http_clients 中读取
      let foundDetour = '';
      const existingClient = (configObj.http_clients || []).find(
        (c: any) => c.tag === RULESET_CLIENT_TAG || c.tag === configObj.route?.default_http_client
      );
      if (existingClient?.detour) {
        foundDetour = existingClient.detour;
      }

      // 2. 兼容旧版 download_detour 模式读取
      if (!foundDetour) {
        for (const r of remoteSets) {
          if (r.download_detour) {
            foundDetour = r.download_detour;
            break;
          }
        }
      }

      // 3. 智能寻找默认代理组（优先 "手动切换"、"Proxy"、selector 类型）
      if (!foundDetour) {
        const preferred =
          obList.find((t) => t === '手动切换' || t === 'Proxy') ||
          (configObj.outbounds || []).find((o: any) => o.type === 'selector')?.tag ||
          obList[0] ||
          'direct';
        foundDetour = preferred;
      }

      setCurrentDetour(foundDetour);

      // 检测是否缺少现代标准配置
      const isMissing =
        !existingClient ||
        configObj.route?.default_http_client !== (existingClient?.tag || RULESET_CLIENT_TAG);
      setHasMissingDetour(isMissing);

      // 若未适配 sing-box 1.14+ 标准，自动无感升级，彻底消除弃用警告
      if (isMissing && remoteSets.length > 0) {
        console.log('[useRulesetDetour] 正在将规则集自动升级至 sing-box 1.14+ http_clients 标准，出站:', foundDetour);
        configObj.http_clients = [
          {
            tag: RULESET_CLIENT_TAG,
            detour: foundDetour,
          },
        ];
        if (!configObj.route) configObj.route = {};
        configObj.route.default_http_client = RULESET_CLIENT_TAG;

        // 清理旧版已被弃用的 download_detour
        for (const r of remoteSets) {
          delete r.download_detour;
        }

        const patchedJson = JSON.stringify(configObj, null, 2);
        await boxBridge.writeFile(SINGBOX_CONFIG_PATH, utf8ToBase64(patchedJson));
        setHasMissingDetour(false);
      }
    } catch (e) {
      console.warn('[useRulesetDetour] 读取或解析 sing-box 配置失败:', e);
    } finally {
      setLoading(false);
    }
  }, [isSingBox]);

  useEffect(() => {
    void loadDetourInfo();
  }, [loadDetourInfo]);

  const updateDetour = useCallback(
    async (newDetour: string): Promise<boolean> => {
      if (!newDetour || !isSingBox) return false;
      setSaving(true);
      try {
        const res = await boxBridge.readFile(SINGBOX_CONFIG_PATH);
        if (!res || !res.content_b64) {
          notify('读取 sing-box 配置文件失败');
          return false;
        }

        const rawJson = base64ToUtf8(res.content_b64);
        const configObj = JSON.parse(rawJson);

        // 写入 sing-box 1.14+ 现代标准配置
        configObj.http_clients = [
          {
            tag: RULESET_CLIENT_TAG,
            detour: newDetour,
          },
        ];
        if (!configObj.route) configObj.route = {};
        configObj.route.default_http_client = RULESET_CLIENT_TAG;

        // 清除所有 remote 规则集残留的 legacy download_detour
        const ruleSets = configObj.route?.rule_set || [];
        for (const r of ruleSets) {
          if (r?.type === 'remote') {
            delete r.download_detour;
          }
        }

        const patchedJson = JSON.stringify(configObj, null, 2);
        await boxBridge.writeFile(SINGBOX_CONFIG_PATH, utf8ToBase64(patchedJson));

        setCurrentDetour(newDetour);
        setHasMissingDetour(false);

        // 重启 sing-box 确保立即以新链路更新规则
        notify(`已将规则集更新出站切换为【${newDetour}】，正在重启服务...`);
        await boxBridge.service('restart');
        notify('sing-box 服务已完成重启');
        return true;
      } catch (err: any) {
        notify(`更新规则集出站失败: ${err?.message || String(err)}`);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [isSingBox]
  );

  return {
    outbounds,
    currentDetour,
    hasMissingDetour,
    ruleSetCount,
    loading,
    saving,
    updateDetour,
    refresh: loadDetourInfo,
  };
}
