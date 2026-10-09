#!/bin/bash

echo "🔧 修复 Cargo 缓存权限问题"
echo ""

# 方案1：使用 sudo 删除受保护的缓存
echo "正在清理 Cargo 缓存..."
sudo rm -rf ~/.cargo/registry/cache/index.crates.io-*
sudo rm -rf ~/.cargo/registry/index/index.crates.io-*/.cache

echo ""
echo "✅ 缓存已清理，请重新运行："
echo "   npm run tauri dev"
