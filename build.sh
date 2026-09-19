#!/bin/sh
# -----------------------------------------------------------------------------
# box4magisk 自动化编译与模块打包脚本
# -----------------------------------------------------------------------------
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# 1. 编译 WebUI 前端产物
if [ -d "webui" ] && [ -f "webui/package.json" ]; then
    echo "==> [1/2] 正在编译 WebUI 前端应用..."
    (cd webui && npm run build)
fi

# 2. 从 module.prop 提取版本号
VERSION="$(grep '^version=' module.prop 2>/dev/null | cut -d= -f2 | tr -d '\r\n')"
[ -z "$VERSION" ] && VERSION="unknown"

ZIP_NAME="box4_${VERSION}.zip"
echo "==> [2/2] 正在打包 Magisk / KernelSU 模块: ${ZIP_NAME}..."

# 3. 打包整个模块（排除源码与构建中间文件）
zip -r -o -X -ll "${ZIP_NAME}" ./ \
    -x '.git/*' \
    -x '.github/*' \
    -x 'build.sh' \
    -x 'box4.json' \
    -x 'webui/node_modules/*' \
    -x 'webui/.gitignore' \
    -x 'webui/tsconfig*' \
    -x 'webui/eslint*' \
    -x 'webui/vite.config*' \
    -x 'webui/package-lock.json' \
    -x 'webui/test.css' \
    -x '*.zip'

echo "==> 模块打包完成: ${ZIP_NAME}"
