import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, X, Download, CheckCircle, AlertCircle, Clock, RefreshCw, ExternalLink, FolderOpen } from 'lucide-react'
import {
  pauseDownload,
  resumeDownload,
  cancelDownload,
  playDownloadedFile,
  openDownloadFolder,
} from '../api/tauri'
import type { DownloadTask } from '../types'

interface TaskCardProps {
  task: DownloadTask
  onRemove: (taskId: string) => void
  onRetry: (task: DownloadTask) => void
  onOpenLogin: () => void
}

export default function TaskCard({ task, onRemove, onRetry, onOpenLogin }: TaskCardProps) {
  const [busy, setBusy] = useState(false)

  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-muted', bg: 'bg-slate-muted/10' },
    downloading: { icon: Download, color: 'text-electric-cyan', bg: 'bg-electric-cyan/10' },
    paused: { icon: Pause, color: 'text-amber-warm', bg: 'bg-amber-warm/10' },
    completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  }

  const config = statusConfig[task.status]
  const StatusIcon = config.icon

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      alert(`操作失败：${e}`)
    } finally {
      setBusy(false)
    }
  }

  const handlePause = () => run(() => pauseDownload(task.id))
  const handleResume = () => run(() => resumeDownload(task.id))
  const handleCancel = () =>
    run(async () => {
      await cancelDownload(task.id)
      onRemove(task.id)
    })
  const handlePlay = () => run(() => playDownloadedFile(task.id))
  const handleOpenFolder = () => run(() => openDownloadFolder(task.id))

  // 错误信息里出现登录态相关关键词时，提示用户去登录并重试
  const errText = (task.error ?? '').toLowerCase()
  const needsLogin = /cookie|fresh|login|登录|登陆|sign|unable|403|401/.test(errText)

  const handleRetry = () => onRetry(task)

  const showProgress = task.status === 'downloading' || task.status === 'pending'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      whileHover={{ scale: 1.01 }}
      className="glass-card p-5 relative group"
    >
      <div className="flex gap-4">
        {/* 缩略图 */}
        <div className="w-32 h-20 rounded-lg bg-graphite/60 flex-shrink-0 overflow-hidden relative">
          {task.thumbnail ? (
            <img src={task.thumbnail} alt={task.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-muted">
              <Download className="w-6 h-6" />
            </div>
          )}

          {/* 状态徽章 */}
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-md ${config.bg}
                          backdrop-blur-sm flex items-center gap-1`}>
            <StatusIcon className={`w-3 h-3 ${config.color}`} />
          </div>
        </div>

        {/* 信息区 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-fog-white font-medium truncate mb-1">{task.title}</h3>
          <p className="text-sm text-slate-muted truncate mb-3">{task.url}</p>

          {/* 进度条 */}
          {showProgress && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-slate-muted mb-1">
                <span>
                  {task.status === 'pending'
                    ? '等待中…'
                    : task.progress === 0
                      ? '解析中…'
                      : `${task.progress}%`}
                </span>
                {task.status === 'downloading' && task.speed != null && (
                  <span>{formatSpeed(task.speed)}</span>
                )}
                {task.status === 'downloading' && task.eta != null && (
                  <span>剩余 {formatTime(task.eta)}</span>
                )}
              </div>
              <div className="h-1.5 bg-graphite rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  className="h-full bg-gradient-to-r from-electric-cyan to-sky-bright relative"
                >
                  {task.status === 'downloading' && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )}
                </motion.div>
              </div>
            </div>
          )}

          {task.status === 'failed' && (
            <div className="mb-2">
              <p className="text-xs text-red-400 mb-2 break-all">
                {task.error ? `下载失败：${task.error}` : '下载失败，请检查链接或网络后重试'}
              </p>
              {needsLogin && (
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onOpenLogin}
                    className="px-3 py-1.5 rounded-lg bg-electric-cyan/15 text-electric-cyan text-xs font-medium flex items-center gap-1.5 hover:bg-electric-cyan/25 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    打开抖音登录
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRetry}
                    className="px-3 py-1.5 rounded-lg bg-amber-warm/15 text-amber-warm text-xs font-medium flex items-center gap-1.5 hover:bg-amber-warm/25 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    重试
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {/* 时间 */}
          <p className="text-xs text-slate-muted">
            {new Date(task.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.status === 'completed' && (
            <motion.button
              title="播放"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePlay}
              disabled={busy}
              className="w-8 h-8 rounded-lg bg-emerald-400/20 text-emerald-400
                         flex items-center justify-center hover:bg-emerald-400/30"
            >
              <Play className="w-4 h-4" />
            </motion.button>
          )}

          {task.status === 'completed' && (
            <motion.button
              title="打开文件夹"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleOpenFolder}
              disabled={busy}
              className="w-8 h-8 rounded-lg bg-electric-cyan/20 text-electric-cyan
                         flex items-center justify-center hover:bg-electric-cyan/30"
            >
              <FolderOpen className="w-4 h-4" />
            </motion.button>
          )}

          {task.status === 'downloading' && (
            <motion.button
              title="暂停"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePause}
              disabled={busy}
              className="w-8 h-8 rounded-lg bg-amber-warm/20 text-amber-warm
                         flex items-center justify-center hover:bg-amber-warm/30"
            >
              <Pause className="w-4 h-4" />
            </motion.button>
          )}

          {task.status === 'paused' && (
            <motion.button
              title="继续"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleResume}
              disabled={busy}
              className="w-8 h-8 rounded-lg bg-electric-cyan/20 text-electric-cyan
                         flex items-center justify-center hover:bg-electric-cyan/30"
            >
              <Play className="w-4 h-4" />
            </motion.button>
          )}

          <motion.button
            title="取消"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCancel}
            disabled={busy}
            className="w-8 h-8 rounded-lg bg-red-400/20 text-red-400
                       flex items-center justify-center hover:bg-red-400/30"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function formatSpeed(bytesPerSec: number): string {
  const mbps = bytesPerSec / 1024 / 1024
  return `${mbps.toFixed(1)} MB/s`
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
