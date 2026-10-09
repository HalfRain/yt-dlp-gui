import { invoke } from '@tauri-apps/api/core'
import type { VideoInfo, DownloadTask } from '../types'

export async function getVideoInfo(url: string, cookiesPath?: string): Promise<VideoInfo> {
  return await invoke('get_video_info', { url, cookiesPath: cookiesPath ?? null })
}

export async function startDownload(
  url: string,
  formatId: string,
  cookiesPath?: string,
): Promise<string> {
  return await invoke('start_download', { url, formatId, cookiesPath: cookiesPath ?? null })
}

export async function pauseDownload(taskId: string): Promise<void> {
  return await invoke('pause_download', { taskId })
}

export async function resumeDownload(taskId: string): Promise<void> {
  return await invoke('resume_download', { taskId })
}

export async function cancelDownload(taskId: string): Promise<void> {
  return await invoke('cancel_download', { taskId })
}

export async function getDownloadProgress(taskId: string): Promise<DownloadTask> {
  return await invoke('get_download_progress', { taskId })
}

export async function playDownloadedFile(taskId: string): Promise<void> {
  return await invoke('play_downloaded_file', { taskId })
}

export async function openDownloadFolder(taskId: string): Promise<void> {
  return await invoke('open_download_folder', { taskId })
}
