# StreamVault 快速启动指南

## ✅ 项目已创建完成！

应用名称：**StreamVault** (流媒体宝库)

## 🎨 设计特色

- **深海军蓝主题** + 电光青色高亮
- **Framer Motion** 流畅动画交互
- **玻璃态卡片** + 渐变进度条带扫光效果
- **响应式悬停** 和状态指示

## 📦 下一步操作

### 1. 安装依赖（手动运行）

由于网络问题，请手动执行：

```bash
# 切换到官方 npm 源（如果淘宝源有问题）
npm config set registry https://registry.npmjs.org

# 安装依赖
npm install
```

### 2. 启动开发模式

```bash
npm run tauri dev
```

### 3. 准备二进制文件（可选，暂时不影响界面）

下载并放置到以下目录：

```
src-tauri/binaries/
├── macos-aarch64/
│   ├── yt-dlp          # 从 github.com/yt-dlp/yt-dlp/releases 下载
│   ├── ffmpeg          # 从 ffmpeg.org 下载
│   └── ffprobe
├── macos-x64/
├── windows-x64/
│   ├── yt-dlp.exe
│   ├── ffmpeg.exe
│   └── ffprobe.exe
└── linux-x64/
```

## 📂 项目结构

```
streamvault/
├── src/                          # React 前端
│   ├── components/
│   │   ├── UrlInput.tsx         # 链接输入框（带动画）
│   │   └── TaskCard.tsx         # 任务卡片（渐变进度）
│   ├── types/index.ts           # TypeScript 类型
│   ├── App.tsx                  # 主应用
│   └── index.css                # Tailwind 样式
│
├── src-tauri/                   # Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口
│   │   ├── commands.rs          # Tauri 命令（待实现）
│   │   └── ytdlp/               # yt-dlp 封装（待实现）
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── package.json
├── tailwind.config.js           # 自定义配色
└── README.md
```

## 🔧 当前状态

✅ **已完成**
- 完整的 Tauri 2 + React 项目骨架
- 炫酷的 UI 界面和动画效果
- 类型定义和组件结构
- Tailwind 配置（自定义深色主题）

⏳ **待实现**（需要你或我继续完成）
- `src-tauri/src/commands.rs` - Tauri 命令实现
- `src-tauri/src/ytdlp/` - yt-dlp 调用逻辑
- 前端与后端的 Tauri API 调用集成
- 格式选择对话框
- 设置面板

## 🎯 核心功能预览

当前界面包含：
1. **顶部统计卡片** - 显示下载中/已完成/失败任务数
2. **链接输入框** - 带聚焦动画和平台标签
3. **任务卡片** - 缩略图、实时进度条（扫光动画）、悬停显示操作按钮
4. **空状态提示** - 无任务时的友好提示

## 🐛 故障排查

### npm 安装超时
```bash
# 方案1：使用淘宝源
npm config set registry https://registry.npmmirror.com

# 方案2：使用代理（如果有）
npm config set proxy http://127.0.0.1:7890

# 方案3：使用 pnpm 或 yarn
pnpm install
# 或
yarn install
```

### Rust 环境检查
```bash
# 检查 Rust 版本
rustc --version
cargo --version

# 如果未安装，访问 https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 📖 详细文档

- `README.md` - 项目介绍和快速开始
- `DEVELOPMENT.md` - 开发指南和技术要点
- `plan.md` - 原始项目规划

## 🎉 完成！

运行 `npm install && npm run tauri dev` 即可看到炫酷的界面！

有任何问题随时问我 🚀
