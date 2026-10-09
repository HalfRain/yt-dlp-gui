use crate::ytdlp::{
    fetch_video_info, launch_download, now_millis, AppState, DownloadHandle, DownloadTask,
    TaskStatus, VideoInfo,
};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_video_info(
    app: AppHandle,
    url: String,
    cookies_path: Option<String>,
) -> Result<VideoInfo, String> {
    fetch_video_info(&app, &url, cookies_path.as_deref()).await
}

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    format_id: String,
    cookies_path: Option<String>,
) -> Result<String, String> {
    let id = uuid::Uuid::new_v4().to_string();
    {
        let mut map = state.tasks.lock().unwrap();
        map.insert(
            id.clone(),
            DownloadHandle {
                child: None,
                task: DownloadTask {
                    id: id.clone(),
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
                cookies_path: cookies_path.clone(),
                was_paused: false,
            },
        );
    }
    if let Err(e) = launch_download(&app, id.clone(), url, format_id, false, cookies_path) {
        state.tasks.lock().unwrap().remove(&id);
        return Err(e);
    }
    Ok(id)
}

#[tauri::command]
pub async fn pause_download(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<(), String> {
    let mut map = state.tasks.lock().unwrap();
    let h = map.get_mut(&task_id).ok_or("任务不存在")?;
    h.was_paused = true;
    h.task.status = TaskStatus::Paused;
    if let Some(child) = h.child.as_mut() {
        let _ = child.start_kill();
    }
    Ok(())
}

#[tauri::command]
pub async fn resume_download(
    app: AppHandle,
    state: State<'_, AppState>,
    task_id: String,
) -> Result<(), String> {
    let (url, format_id, cookies_path) = {
        let map = state.tasks.lock().unwrap();
        let h = map.get(&task_id).ok_or("任务不存在")?;
        (h.url.clone(), h.format_id.clone(), h.cookies_path.clone())
    };
    {
        let mut map = state.tasks.lock().unwrap();
        if let Some(h) = map.get_mut(&task_id) {
            h.task.status = TaskStatus::Downloading;
            h.was_paused = false;
        }
    }
    launch_download(&app, task_id, url, format_id, true, cookies_path)
}

#[tauri::command]
pub async fn cancel_download(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<(), String> {
    let mut map = state.tasks.lock().unwrap();
    if let Some(mut handle) = map.remove(&task_id) {
        if let Some(child) = handle.child.as_mut() {
            let _ = child.start_kill();
        }
        // 确保 handle 作用域内 drop 前子进程已收到 kill
        let _ = &mut handle;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_download_progress(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<DownloadTask, String> {
    let map = state.tasks.lock().unwrap();
    let h = map.get(&task_id).ok_or("任务不存在")?;
    Ok(h.task.clone())
}

#[tauri::command]
pub async fn play_downloaded_file(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<(), String> {
    let path = {
        let map = state.tasks.lock().unwrap();
        let h = map.get(&task_id).ok_or("任务不存在")?;
        h.output_path
            .clone()
            .or_else(|| h.task.output_path.clone())
            .ok_or("文件尚未下载完成")?
    };
    if !std::path::Path::new(&path).exists() {
        return Err(format!("文件不存在: {path}"));
    }
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("无法打开播放器: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn open_download_folder(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<(), String> {
    let path = {
        let map = state.tasks.lock().unwrap();
        let h = map.get(&task_id).ok_or("任务不存在")?;
        h.output_path
            .clone()
            .or_else(|| h.task.output_path.clone())
            .ok_or("文件尚未下载完成")?
    };
    if !std::path::Path::new(&path).exists() {
        return Err(format!("文件不存在: {path}"));
    }
    // macOS: open -R 在 Finder 中定位该文件
    std::process::Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| format!("无法打开文件夹: {e}"))?;
    Ok(())
}
