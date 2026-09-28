#!/sbin/sh

SKIPUNZIP=1
ASH_STANDALONE=1

if [ "$BOOTMODE" != true ] ; then
  abort "Error: Please install in Magisk Manager, KernelSU Manager or APatch"
fi

if [ "$KSU" = true ] && [ "$KSU_VER_CODE" -lt 10670 ] ; then
  abort "Error: Please update your KernelSU"
fi

if [ "$KSU" = true ] && [ "$KSU_VER_CODE" -lt 10683 ] ; then
  service_dir="/data/adb/ksu/service.d"
else 
  service_dir="/data/adb/service.d"
fi

if [ ! -d "$service_dir" ] ; then
    mkdir -p $service_dir
fi

# 音量键选择函数：音量上返回0（是），音量下返回1（否），超时自动默认继续
chooseport() {
  local count=0
  while [ $count -lt 5 ]; do
    timeout 2 /system/bin/getevent -lqc 1 2>&1 > $TMPDIR/events &
    sleep 1
    if grep -q 'KEY_VOLUMEUP *DOWN' $TMPDIR/events 2>/dev/null; then
      return 0
    elif grep -q 'KEY_VOLUMEDOWN *DOWN' $TMPDIR/events 2>/dev/null; then
      return 1
    fi
    count=$((count + 1))
  done
  ui_print "- 超时未按键，默认继续更新..."
  return 0
}

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d $MODPATH

if [ -d /data/adb/box ] ; then
  cp /data/adb/box/scripts/box.config /data/adb/box/scripts/box.config.bak
  ui_print "- User configuration box.config has been backed up to box.config.bak"

  # 检测是否有正在运行的核心进程
  running_bin=""
  for bin in sing-box mihomo clash xray v2ray hysteria; do
    if pidof "$bin" > /dev/null 2>&1; then
      running_bin="$bin"
      break
    fi
  done

  if [ -n "$running_bin" ]; then
    ui_print " "
    ui_print "⚠ 检测到 $running_bin 正在运行"
    ui_print "  音量[+] = 停止服务并继续更新"
    ui_print "  音量[-] = 取消安装"
    ui_print " "
    if chooseport; then
      ui_print "- 正在停止服务和透明代理..."
      /data/adb/box/scripts/box.tproxy stop > /dev/null 2>&1
      /data/adb/box/scripts/box.service stop > /dev/null 2>&1
      ui_print "- 服务已停止，继续更新"
    else
      abort "- 用户取消安装"
    fi
  fi

  cat /data/adb/box/scripts/box.config >> $MODPATH/box/scripts/box.config
  cp -f $MODPATH/box/scripts/* /data/adb/box/scripts/
  ui_print "- User configuration box.config has been"
  ui_print "- attached to the module box.config,"
  ui_print "- please re-edit box.config"
  ui_print "- after the update is complete."

  # 同步内置核心文件（若目标缺失或模块带有新核心）
  mkdir -p /data/adb/box/bin
  if [ -d "$MODPATH/box/bin" ]; then
    cp -rf "$MODPATH/box/bin"/* /data/adb/box/bin/ 2>/dev/null
    ui_print "- Synchronized built-in cores to /data/adb/box/bin/"
  fi

  # 补全缺失的核心默认配置目录
  for core in sing-box clash mihomo xray v2ray hysteria; do
    if [ -d "$MODPATH/box/$core" ] && [ ! -d "/data/adb/box/$core" ]; then
      cp -rf "$MODPATH/box/$core" /data/adb/box/
      ui_print "- Initialized default config for $core"
    fi
  done

  rm -rf $MODPATH/box
else
  mv $MODPATH/box /data/adb/
fi

if [ "$KSU" = true ] ; then
  sed -i 's/name=box4magisk/name=box4KernelSU/g' $MODPATH/module.prop
fi

if [ "$APATCH" = true ] ; then
  sed -i 's/name=box4magisk/name=box4APatch/g' $MODPATH/module.prop
fi

# KSU/APatch 使用内嵌 WebUI，清理可能残留的独立 KsuWebUI 应用
if [ "$KSU" = true ] || [ "$APATCH" = true ]; then
  if pm list packages 2>/dev/null | grep -q "io.github.a13e300.ksuwebui"; then
    pm uninstall "io.github.a13e300.ksuwebui" > /dev/null 2>&1
    ui_print "- Removed standalone KsuWebUI (using built-in WebUI)"
  fi
fi

mkdir -p /data/adb/box/bin/
mkdir -p /data/adb/box/run/

mv -f $MODPATH/box4_service.sh $service_dir/

rm -f customize.sh

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm_recursive /data/adb/box/ 0 0 0755 0644
set_perm_recursive /data/adb/box/scripts/ 0 0 0755 0700
set_perm_recursive /data/adb/box/bin/ 0 0 0755 0700

set_perm $service_dir/box4_service.sh 0 0 0700

# fix "set_perm_recursive /data/adb/box/scripts" not working on some phones.
chmod ugo+x /data/adb/box/scripts/*

# Magisk WebUI 兼容适配（参考 HyperOS 完美横屏计划）
if [ "$KSU" != true ] && [ "$APATCH" != true ]; then
  ui_print "- Magisk environment detected"
  if [ -f "$MODPATH/action.sh" ]; then
    set_perm $MODPATH/action.sh 0 0 0755
    ui_print "- Action button support enabled"
  fi
  # 检查是否已安装 WebUI 独立宿主应用
  if ! pm list packages 2>/dev/null | grep -q -e "io.github.a13e300.ksuwebui" -e "com.dergoogler.mmrl"; then
    if [ -f "$MODPATH/tools/KsuWebUI.apk" ]; then
      ui_print "- Installing KsuWebUI companion app for Magisk..."
      pm install -r "$MODPATH/tools/KsuWebUI.apk" >/dev/null 2>&1
      if pm list packages 2>/dev/null | grep -q "io.github.a13e300.ksuwebui"; then
        ui_print "- KsuWebUI installed successfully!"
      fi
    fi
  fi
  ui_print "- You can tap [Action] button in Magisk to open WebUI"
fi

for pid in $(pidof inotifyd) ; do
  if grep -q -e "box.inotify" -e "webui_service.inotify" /proc/${pid}/cmdline 2>/dev/null; then
    kill ${pid}
  fi
done

inotifyd "/data/adb/box/scripts/box.inotify" "$MODPATH" > /dev/null 2>&1 &
mkdir -p /data/adb/box/run/webui_service_queue
inotifyd "/data/adb/box/scripts/webui_service.inotify" "/data/adb/box/run/webui_service_queue:nw" > /dev/null 2>&1 &

# 若在线覆盖安装且活跃模块目录已存在，热同步最新文件，实现免重启即刻更新生效
if [ -d "/data/adb/modules/box4" ] && [ "$MODPATH" != "/data/adb/modules/box4" ]; then
  cp -rf "$MODPATH"/* /data/adb/modules/box4/ 2>/dev/null
  ui_print "- Hot-synced updated module files to active directory"
fi