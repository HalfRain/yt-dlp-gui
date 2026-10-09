export type TaskStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed'

export interface DownloadTask {
  id: string
  url: string
  title: string
  thumbnail?: string
  status: TaskStatus
  progress: number
  speed?: number
  eta?: number
  createdAt: number
  format?: string
  filesize?: number
  filePath?: string
  error?: string
}

export interface VideoInfo {
  url: string
  title: string
  thumbnail?: string
  duration?: number
  uploader?: string
  description?: string
  formats: VideoFormat[]
}

export interface VideoFormat {
  formatId: string
  formatNote?: string
  ext?: string
  filesize?: number
  width?: number
  height?: number
}

export interface DownloadProgressPayload {
  taskId: string
  progress: number
  speed?: number
  eta?: number
  downloaded?: number
  total?: number
  status: TaskStatus
  outputPath?: string
  title?: string
  thumbnail?: string
  errorMessage?: string
}
