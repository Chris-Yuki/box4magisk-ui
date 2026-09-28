#!/system/bin/sh
# -----------------------------------------------------------------------------
# box4magisk Action Button Script (Magisk v26+)
# 参考 HyperOS 完美横屏计划实现：一键从 Magisk 模块列表呼出 WebUI 控制台
# -----------------------------------------------------------------------------

MODDIR="/data/adb/modules/box4"
[ -n "$(magisk -v 2>/dev/null | grep lite)" ] && MODDIR="/data/adb/lite_modules/box4"

# KSU/APatch 使用原生 WebUI，action 按钮无需执行
if [ -d "/data/adb/ksu" ] || [ -d "/data/adb/ap" ]; then
  echo "==> KSU/APatch 环境请使用内置 WebUI 管理面板"
  exit 0
fi

# 若存在未重启的 Magisk 覆盖更新目录，热同步最新文件至活跃目录，免重启即可生效
if [ -d "/data/adb/modules_update/box4" ]; then
  cp -rf /data/adb/modules_update/box4/* "$MODDIR/" 2>/dev/null
fi

WEBROOT="${MODDIR}/webroot"
WEBUI_APP="io.github.a13e300.ksuwebui"
MMRL_APP="com.dergoogler.mmrl"
HTTP_PORT=52080

# 确保后台事件监听守护进程在运行（无需重启即可平滑响应 WebUI 的服务操作）
if ! pgrep -f "webui_service.inotify" >/dev/null 2>&1; then
    mkdir -p /data/adb/box/run/webui_service_queue
    inotifyd /data/adb/box/scripts/webui_service.inotify /data/adb/box/run/webui_service_queue:nw >/dev/null 2>&1 &
fi

# 1. 优先使用 KsuWebUI 宿主（传递必需的 id、name 与 moduleDir 参数）
if pm list packages 2>/dev/null | grep -q "$WEBUI_APP"; then
    echo "==> 正在使用 KsuWebUI 唤起控制面板..."
    echo "==> 若首次打开，请务必在系统弹窗中授予 Root 权限"
    # KsuWebUI 的 WebUIActivity 严格校验 id 和 name Extra 参数，缺失会导致直接退出
    am start -n "${WEBUI_APP}/.WebUIActivity" \
        --es id "box4" \
        --es name "box4magisk" \
        --es moduleDir "${MODDIR}" >/dev/null 2>&1
    exit 0
fi

# 2. 检测 MMRL 宿主
if pm list packages 2>/dev/null | grep -q "$MMRL_APP"; then
    echo "==> 正在使用 MMRL 唤起控制面板..."
    am start -a android.intent.action.VIEW -d "ksu://webui/box4" >/dev/null 2>&1
    exit 0
fi

# 3. 若宿主未安装，尝试从模块 tools/ 目录静默安装随包附带的 KsuWebUI.apk
if [ -f "${MODDIR}/tools/KsuWebUI.apk" ]; then
    echo "==> 检测到尚未安装 WebUI 宿主，正在为您安装配套 KsuWebUI..."
    pm install -r "${MODDIR}/tools/KsuWebUI.apk" >/dev/null 2>&1
    if pm list packages 2>/dev/null | grep -q "$WEBUI_APP"; then
        echo "==> 安装成功，正在打开控制面板..."
        am start -n "${WEBUI_APP}/.WebUIActivity" \
            --es id "box4" \
            --es name "box4magisk" \
            --es moduleDir "${MODDIR}" >/dev/null 2>&1
        exit 0
    fi
fi

# 4. 回退方案 (Fallback)：使用系统 busybox httpd 启动本地轻量 Web 服务并通过默认浏览器打开
echo "==> 启动本地 HTTP 模式 (端口: ${HTTP_PORT})..."

# 确保后台 httpd 正在运行
if ! pgrep -f "httpd -p ${HTTP_PORT}" >/dev/null 2>&1; then
    if [ -d "$WEBROOT" ]; then
        busybox httpd -p "127.0.0.1:${HTTP_PORT}" -h "$WEBROOT" 2>/dev/null
    fi
fi

# 唤起系统浏览器访问
am start -a android.intent.action.VIEW -d "http://127.0.0.1:${HTTP_PORT}" >/dev/null 2>&1
echo "==> 已在浏览器中打开 Web 控制台: http://127.0.0.1:${HTTP_PORT}"
