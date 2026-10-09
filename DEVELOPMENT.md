# StreamVault 开发指南

## 当前状态

✅ 项目骨架已完成
- Tauri 2 + React 18 + TypeScript
- Framer Motion 动画库
- Tailwind CSS 样式系统
- 炫酷的深色主题 UI

⏳ 待实现功能
- yt-dlp 后端集成
- 实际下载逻辑
- 格式选择器
- 任务队列管理

## 下一步行动

### 1. 安装依赖并运行

```bash
npm install
npm run tauri dev
```

### 2. 需要准备的二进制文件

在 `src-tauri/binaries/` 目录下放置：
- `yt-dlp` (或 `yt-dlp.exe` for Windows)
- `ffmpeg` (或 `ffmpeg.exe`)
- `ffprobe` (或 `ffprobe.exe`)

按平台组织：
```
src-tauri/binaries/
├── macos-aarch64/
│   ├── yt-dlp
│   ├── ffmpeg
│   └── ffprobe
├── macos-x64/
├── windows-x64/
└── linux-x64/
```

### 3. 核心待实现模块

#### `src-tauri/src/ytdlp/executor.rs`
负责调用 yt-dlp 二进制：
- 解析视频元数据 (`-J` 参数)
- 执行下载任务
- 解析进度输出

#### `src-tauri/src/ytdlp/manager.rs`
管理下载任务：
- 任务队列
- 并发控制
- 暂停/恢复/取消

#### `src-tauri/src/commands.rs`
完善 Tauri 命令实现

### 4. 前端增强点

- 格式选择对话框（弹窗显示可用格式）
- 设置面板（下载路径、代理、并发数）
- 更细致的错误提示
- 下载完成通知

## 设计特点

- **配色方案**: 深海军蓝 + 电光青色，避免紫色和粉色
- **动画**: Framer Motion 提供流畅的过渡和悬停效果
- **玻璃态**: backdrop-blur 实现毛玻璃卡片
- **渐变进度条**: 带扫光动画
- **响应式按钮**: hover 放大，点击缩小

## 技术要点

### Tauri Shell Sidecar
使用 sidecar 模式调用 yt-dlp：
```rust
use tauri_plugin_shell::ShellExt;

let shell = app.shell();
let output = shell
    .sidecar("yt-dlp")
    .args(["-J", url])
    .output()
    .await?;
```

### 进度解析
yt-dlp 输出格式：
```
[download] 45.2% of 123.45MiB at 5.67MiB/s ETA 00:12
```

需要正则匹配提取：进度、速度、ETA

### 状态管理
使用 `Arc<Mutex<HashMap>>` 管理任务状态，支持跨线程访问。

## 联系与协作

有问题随时问我，我会帮你完善具体实现！
