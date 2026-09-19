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

unzip -qo "${ZIPFILE}" -x 'META-INF/*' -d $MODPATH

if [ -d /data/adb/box ] ; then
  cp /data/adb/box/scripts/box.config /data/adb/box/scripts/box.config.bak
  ui_print "- User configuration box.config has been backed up to box.config.bak"

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

for pid in $(pidof inotifyd) ; do
  if grep -q box.inotify /proc/${pid}/cmdline ; then
    kill ${pid}
  fi
done

inotifyd "/data/adb/box/scripts/box.inotify" "$MODPATH" > /dev/null 2>&1 &