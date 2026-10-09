#!/bin/bash

echo "🚀 StreamVault 项目初始化脚本"
echo ""

# 切换 npm 源
echo "📦 切换到官方 npm 源..."
npm config set registry https://registry.npmjs.org

# 安装依赖
echo "📥 安装前端依赖..."
npm install

# 检查 Rust 环境
echo "🦀 检查 Rust 环境..."
if ! command -v cargo &> /dev/null; then
    echo "❌ 未检测到 Rust，请先安装: https://rustup.rs/"
    exit 1
fi

echo ""
echo "✅ 初始化完成！"
echo ""
echo "接下来的步骤："
echo "1. 运行 'npm run tauri dev' 启动开发模式"
echo "2. 查看 DEVELOPMENT.md 了解详细配置"
echo ""
