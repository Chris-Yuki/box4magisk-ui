import { useState, useCallback } from 'react';
import { boxBridge, notify } from '@/lib/bridge';

// UTF-8 安全的 base64 编码
function utf8ToBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    ));
  } catch {
    return btoa(str);
  }
}

// UTF-8 安全的 base64 解码
function base64ToUtf8(b64: string): string {
  try {
    const binStr = atob(b64);
    return decodeURIComponent(
      Array.from(binStr).map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
  } catch {
    return atob(b64);
  }
}

export function useConfigEditor() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  // 加载指定文件
  const loadFile = useCallback(async (path: string) => {
    setLoading(true);
    setCurrentPath(path);
    try {
      const res = await boxBridge.readFile(path);
      if (res && res.content_b64) {
        setContent(base64ToUtf8(res.content_b64));
      } else {
        setContent('');
      }
    } catch (e) {
      notify(`读取文件失败: ${e instanceof Error ? e.message : String(e)}`);
      setContent('');
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存指定文件
  const saveFile = useCallback(async (path: string, text: string) => {
    setSaving(true);
    try {
      const b64 = utf8ToBase64(text);
      await boxBridge.writeFile(path, b64);
      setContent(text);
      notify('文件已成功保存');
      return true;
    } catch (e) {
      notify(`保存失败: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    content,
    setContent,
    loading,
    saving,
    currentPath,
    loadFile,
    saveFile,
  };
}
