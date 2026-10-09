use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub url: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub duration: Option<u64>,
    pub uploader: Option<String>,
    pub description: Option<String>,
    pub formats: Vec<VideoFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoFormat {
    pub format_id: String,
    pub format_note: Option<String>,
    pub ext: Option<String>,
    pub filesize: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadTask {
    pub id: String,
    pub url: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub status: TaskStatus,
    pub progress: f32,
    pub speed: Option<u64>,
    pub eta: Option<u64>,
    pub created_at: u64,
    pub format: Option<String>,
    pub filesize: Option<u64>,
    pub output_path: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    Downloading,
    Paused,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressPayload {
    pub task_id: String,
    pub progress: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub eta: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloaded: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u64>,
    pub status: TaskStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

pub struct DownloadHandle {
    pub child: Option<tokio::process::Child>,
    pub task: DownloadTask,
    pub url: String,
    pub format_id: String,
    pub output_path: Option<String>,
    pub cookies_path: Option<String>,
    pub was_paused: bool,
}

#[derive(Default)]
pub struct AppState {
    pub tasks: Mutex<HashMap<String, DownloadHandle>>,
}

const BIN_SUBDIR: &str = "binaries/macos-aarch64";

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// 解析内置二进制路径：生产环境优先 resource_dir，dev 回退 CARGO_MANIFEST_DIR。
pub fn resolve_bin(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    if let Ok(dir) = app.path().resource_dir() {
        let p = dir.join(BIN_SUBDIR).join(name);
        if p.exists() {
            return Ok(p);
        }
    }
    let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join(BIN_SUBDIR)
        .join(name);
    if dev.exists() {
        Ok(dev)
    } else {
        Err(format!("未找到内置二进制: {name}"))
    }
}

/// 保存目录：首选 ~/Downloads/StreamVault（macOS 需“下载文件夹”授权），
/// 无权限时回退到应用私有数据目录，保证下载在任何授权状态下都能进行。
pub fn save_dir() -> Result<PathBuf, String> {
    // 1. 优先 ~/Downloads/StreamVault（生产打包后系统会弹授权框）
    if let Some(base) = dirs::download_dir() {
        let dir = base.join("StreamVault");
        match std::fs::create_dir_all(&dir) {
            Ok(_) => return Ok(dir),
            Err(e) => {
                eprintln!(
                    "[save_dir] Downloads 不可用: {} (kind={:?}, raw={:?})",
                    dir.display(),
                    e.kind(),
                    e.raw_os_error()
                );
            }
        }
    }
    // 2. 回退到用户主目录下的隐藏目录（dev 模式无 TCC 限制）
    let dir = dirs::home_dir()
        .ok_or("无法定位用户主目录")?
        .join(".streamvault")
        .join("downloads");
    match std::fs::create_dir_all(&dir) {
        Ok(_) => return Ok(dir),
        Err(e) => {
            eprintln!(
                "[save_dir] ~/.streamvault 不可用: {} (kind={:?}, raw={:?})",
                dir.display(),
                e.kind(),
                e.raw_os_error()
            );
        }
    }
    // 3. 最终兜底：系统临时目录（任何进程都有权限）
    let dir = std::env::temp_dir().join("streamvault-downloads");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建下载目录失败: {} ({}={})", dir.display(), e, e.raw_os_error().unwrap_or(-1)))?;
    eprintln!("[save_dir] 使用临时目录兜底: {}", dir.display());
    Ok(dir)
}

fn parse_num(s: Option<&&str>) -> Option<u64> {
    let s = s?.trim();
    if s.is_empty() || s.eq_ignore_ascii_case("NA") || s == "None" {
        return None;
    }
    s.parse::<f64>().ok().filter(|v| *v >= 0.0).map(|v| v as u64)
}

pub async fn fetch_video_info(
    app: &AppHandle,
    url: &str,
    cookies_path: Option<&str>,
) -> Result<VideoInfo, String> {
    let ytdlp = resolve_bin(app, "yt-dlp")?;
    let mut cmd = Command::new(&ytdlp);
    cmd.args(["-J", "--no-playlist", "--no-warnings"]);
    match cookies_path {
        Some(p) if !p.is_empty() => {
            cmd.args(["--cookies", p]);
        }
        _ => {
            cmd.args(["--cookies-from-browser", "chrome"]);
        }
    }
    let output = cmd
        .arg(url)
        .output()
        .await
        .map_err(|e| format!("启动 yt-dlp 失败: {e}"))?;
    if !output.status.success() {
        let msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if msg.is_empty() {
            "获取视频信息失败".to_string()
        } else {
            msg
        });
    }
    let v: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("解析视频信息失败: {e}"))?;
    Ok(parse_video_info(url, &v))
}

fn parse_video_info(url: &str, v: &serde_json::Value) -> VideoInfo {
    let as_str = |key: &str| v.get(key).and_then(|x| x.as_str()).map(String::from);
    let as_u64 = |key: &str| v.get(key).and_then(|x| x.as_u64());
    let formats = v
        .get("formats")
        .and_then(|f| f.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|f| {
                    Some(VideoFormat {
                        format_id: f.get("format_id")?.as_str()?.to_string(),
                        format_note: f
                            .get("format_note")
                            .and_then(|x| x.as_str())
                            .map(String::from),
                        ext: f.get("ext").and_then(|x| x.as_str()).map(String::from),
                        filesize: f
                            .get("filesize")
                            .and_then(|x| x.as_u64())
                            .or_else(|| f.get("filesize_approx").and_then(|x| x.as_u64())),
                        width: f.get("width").and_then(|x| x.as_u64()).map(|x| x as u32),
                        height: f.get("height").and_then(|x| x.as_u64()).map(|x| x as u32),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    VideoInfo {
        url: url.to_string(),
        title: as_str("title").unwrap_or_else(|| url.to_string()),
        thumbnail: as_str("thumbnail"),
        duration: as_u64("duration"),
        uploader: as_str("uploader").or_else(|| as_str("channel")),
        description: as_str("description"),
        formats,
    }
}

/// 构造并启动一个 yt-dlp 下载进程，读取进度并通过事件推给前端。
/// 调用前 handle 必须已插入 state（start_download 负责插入）。
pub fn launch_download(
    app: &AppHandle,
    task_id: String,
    url: String,
    format_id: String,
    resume: bool,
    cookies_path: Option<String>,
) -> Result<(), String> {
    let ytdlp = resolve_bin(app, "yt-dlp")?;
    let ffmpeg_dir = resolve_bin(app, "ffmpeg")?
        .parent()
        .ok_or("无法解析 ffmpeg 目录")?
        .to_path_buf();
    let out_template = save_dir()?.join("%(title)s.%(ext)s");

    let mut cmd = Command::new(&ytdlp);
    cmd.args([
        "--no-playlist",
        "--newline",
        "--no-color",
        "--no-warnings",
        "--ffmpeg-location",
    ]);
    cmd.arg(&ffmpeg_dir);
    // cookies：用户指定的 cookies 文件优先；未指定时回退读取 Chrome 浏览器 cookies
    match &cookies_path {
        Some(p) if !p.is_empty() => {
            cmd.args(["--cookies", p]);
        }
        _ => {
            cmd.args(["--cookies-from-browser", "chrome"]);
        }
    }
    cmd.args(["--merge-output-format", "mp4", "-o"]);
    cmd.arg(&out_template);
    cmd.args([
        "--progress-template",
        "PROG|%(progress.downloaded_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s",
        "--print",
        "pre_process:META|%(.{title,thumbnail})j",
        "--print",
        "after_move:FPATH|%(filepath)s",
    ]);
    if !format_id.is_empty() {
        cmd.args(["-f", &format_id]);
    }
    if resume {
        cmd.arg("--continue");
    }
    cmd.arg(&url);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("启动下载进程失败: {e}"))?;
    let stdout = child.stdout.take().ok_or("无法捕获下载进程输出")?;
    let stderr = child.stderr.take().ok_or("无法捕获下载进程错误输出")?;

    {
        let state = app.state::<AppState>();
        let mut map = state.tasks.lock().unwrap();
        let h = map.entry(task_id.clone()).or_insert_with(|| DownloadHandle {
            child: None,
            task: DownloadTask {
                id: task_id.clone(),
                url: url.clone(),
                title: url.clone(),
                thumbnail: None,
                status: TaskStatus::Pending,
                progress: 0.0,
                speed: None,
                eta: None,
                created_at: now_millis(),
                format: if format_id.is_empty() {
                    None
                } else {
                    Some(format_id.clone())
                },
                filesize: None,
                output_path: None,
                error_message: None,
            },
            url: url.clone(),
            format_id: format_id.clone(),
            output_path: None,
            cookies_path: None,
            was_paused: false,
        });
        h.child = Some(child);
        h.was_paused = false;
        h.task.status = TaskStatus::Downloading;
        h.url = url.clone();
        h.format_id = format_id.clone();
        h.cookies_path = cookies_path.clone();
    }

    // 立即通知前端任务进入进行中（部分平台解析阶段较长，如小红书约 20-30s）
    let _ = app.emit(
        "download-progress",
        DownloadProgressPayload {
            task_id: task_id.clone(),
            progress: 0.0,
            speed: None,
            eta: None,
            downloaded: None,
            total: None,
            status: TaskStatus::Downloading,
            output_path: None,
            title: None,
            thumbnail: None,
            error_message: None,
        },
    );

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        // 并发排空 stderr：避免进程因管道写满而阻塞，同时保留错误信息供失败时解析
        let stderr_handle: tokio::task::JoinHandle<Vec<String>> = tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut buf: Vec<String> = Vec::new();
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let t = line.trim();
                if !t.is_empty() {
                    buf.push(t.to_string());
                }
            }
            buf
        });
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if let Some(rest) = line.strip_prefix("PROG|") {
                let parts: Vec<&str> = rest.split('|').collect();
                let downloaded = parse_num(parts.first());
                let total = parse_num(parts.get(1));
                let speed = parse_num(parts.get(2));
                let eta = parse_num(parts.get(3));
                let progress = match (downloaded, total) {
                    (Some(d), Some(t)) if t > 0 => ((d as f64 / t as f64) * 100.0).min(99.0) as f32,
                    _ => 0.0,
                };
                let payload = {
                    let state = app.state::<AppState>();
                    let mut map = state.tasks.lock().unwrap();
                    match map.get_mut(&task_id) {
                        Some(h) => {
                            h.task.status = TaskStatus::Downloading;
                            h.task.progress = progress;
                            h.task.speed = speed;
                            h.task.eta = eta;
                            if total.is_some() {
                                h.task.filesize = total;
                            }
                            Some(DownloadProgressPayload {
                                task_id: task_id.clone(),
                                progress,
                                speed,
                                eta,
                                downloaded,
                                total,
                                status: TaskStatus::Downloading,
                                output_path: h.output_path.clone(),
                                title: None,
                                thumbnail: None,
                                error_message: None,
                            })
                        }
                        None => None,
                    }
                };
                if let Some(p) = payload {
                    let _ = app.emit("download-progress", p);
                }
            } else if let Some(json) = line.strip_prefix("META|") {
                // 下载开始前由同一进程输出的标题/缩略图（JSON 一行）
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(json) {
                    let title = v.get("title").and_then(|x| x.as_str()).map(String::from);
                    let thumbnail = v
                        .get("thumbnail")
                        .and_then(|x| x.as_str())
                        .map(String::from);
                    let payload = {
                        let state = app.state::<AppState>();
                        let mut map = state.tasks.lock().unwrap();
                        match map.get_mut(&task_id) {
                            Some(h) => {
                                if let Some(t) = &title {
                                    h.task.title = t.clone();
                                }
                                if let Some(th) = &thumbnail {
                                    h.task.thumbnail = Some(th.clone());
                                }
                                Some(DownloadProgressPayload {
                                    task_id: task_id.clone(),
                                    progress: h.task.progress,
                                    speed: None,
                                    eta: None,
                                    downloaded: None,
                                    total: None,
                                    status: TaskStatus::Downloading,
                                    output_path: None,
                                    title,
                                    thumbnail,
                                    error_message: None,
                                })
                            }
                            None => None,
                        }
                    };
                    if let Some(p) = payload {
                        let _ = app.emit("download-progress", p);
                    }
                }
            } else if let Some(path) = line.strip_prefix("FPATH|") {
                let p = path.trim().to_string();
                let state = app.state::<AppState>();
                let mut map = state.tasks.lock().unwrap();
                if let Some(h) = map.get_mut(&task_id) {
                    h.output_path = Some(p.clone());
                    h.task.output_path = Some(p);
                }
            }
        }

        // 管道结束，回收子进程并判定最终状态
        let (was_paused, child_opt) = {
            let state = app.state::<AppState>();
            let mut map = state.tasks.lock().unwrap();
            match map.get_mut(&task_id) {
                Some(h) => (h.was_paused, h.child.take()),
                None => return, // 已被 cancel 移除
            }
        };
        let final_status = if let Some(mut child) = child_opt {
            match child.wait().await {
                Ok(s) if s.success() => TaskStatus::Completed,
                _ => {
                    if was_paused {
                        TaskStatus::Paused
                    } else {
                        TaskStatus::Failed
                    }
                }
            }
        } else if was_paused {
            TaskStatus::Paused
        } else {
            TaskStatus::Failed
        };

        // 失败时回收 stderr 并解析出对用户有意义的错误信息
        let stderr_lines = stderr_handle.await.unwrap_or_default();
        let error_message: Option<String> = if matches!(final_status, TaskStatus::Failed) {
            if stderr_lines.is_empty() {
                None
            } else {
                stderr_lines
                    .iter()
                    .find(|l| {
                        let low = l.to_lowercase();
                        low.contains("cookie")
                            || low.contains("fresh")
                            || low.contains("login")
                            || low.contains("error")
                            || low.contains("failed")
                            || low.contains("unable")
                            || low.contains("sign")
                    })
                    .or_else(|| stderr_lines.last())
                    .cloned()
            }
        } else {
            None
        };

        let payload = {
            let state = app.state::<AppState>();
            let mut map = state.tasks.lock().unwrap();
            match map.get_mut(&task_id) {
                Some(h) => {
                    h.task.status = final_status;
                    h.task.error_message = error_message.clone();
                    if matches!(final_status, TaskStatus::Completed) {
                        h.task.progress = 100.0;
                    }
                    DownloadProgressPayload {
                        task_id: task_id.clone(),
                        progress: h.task.progress,
                        speed: None,
                        eta: None,
                        downloaded: None,
                        total: h.task.filesize,
                        status: final_status,
                        output_path: h.output_path.clone(),
                        title: None,
                        thumbnail: None,
                        error_message,
                    }
                }
                None => return,
            }
        };
        let _ = app.emit("download-progress", payload);
    });

    Ok(())
}
