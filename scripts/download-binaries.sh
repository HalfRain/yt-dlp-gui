#!/usr/bin/env bash
# 下载 StreamVault 所需的内置二进制文件到 src-tauri/binaries/macos-aarch64/
# 由于这些二进制体积较大（约 134MB），不纳入 Git 管理，克隆仓库后请先运行本脚本。
set -euo pipefail

YTDLP_VERSION="2026.08.19"
# evermeet.cx 提供 macOS 静态构建的 ffmpeg / ffprobe（始终为最新发布版）
FFMPEG_BASE="https://evermeet.cx/ffmpeg/getrelease"

TARGET_DIR="src-tauri/binaries/macos-aarch64"
mkdir -p "$TARGET_DIR"

echo "==> 下载 yt-dlp ${YTDLP_VERSION}"
curl -fL --retry 3 \
  -o "$TARGET_DIR/yt-dlp" \
  "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp"

echo "==> 下载 ffmpeg"
curl -fL --retry 3 \
  -o /tmp/ffmpeg.zip \
  "${FFMPEG_BASE}/ffmpeg/zip"
unzip -o -j /tmp/ffmpeg.zip -d "$TARGET_DIR" ffmpeg
rm -f /tmp/ffmpeg.zip

echo "==> 下载 ffprobe"
curl -fL --retry 3 \
  -o /tmp/ffprobe.zip \
  "${FFMPEG_BASE}/ffprobe/zip"
unzip -o -j /tmp/ffprobe.zip -d "$TARGET_DIR" ffprobe
rm -f /tmp/ffprobe.zip

echo "==> 设置可执行权限"
chmod +x "$TARGET_DIR/yt-dlp" "$TARGET_DIR/ffmpeg" "$TARGET_DIR/ffprobe"

echo "==> 验证版本"
"$TARGET_DIR/yt-dlp" --version
"$TARGET_DIR/ffmpeg" -version | head -1
"$TARGET_DIR/ffprobe" -version | head -1

echo "✅ 二进制已就绪：$TARGET_DIR"
