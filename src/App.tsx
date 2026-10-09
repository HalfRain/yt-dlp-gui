import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Clock, CheckCircle, AlertCircle, Music2 } from 'lucide-react'
import { open } from '@tauri-apps/plugin-shell'
import { listen } from '@tauri-apps/api/event'
import UrlInput from './components/UrlInput'
import TaskCard from './components/TaskCard'
import { startDownload } from './api/tauri'
import type { DownloadTask, DownloadProgressPayload } from './types'

type StatusFilter = 'downloading' | 'completed' | 'failed' | null

function App() {
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null)
  const [cookiesPath, setCookiesPath] = useState<string>('')

  useEffect(() => {
    const unlistenPromise = listen<DownloadProgressPayload>('download-progress', (event) => {
      const p = event.payload
      setTasks(prev =>
        prev.map(t => {
          if (t.id !== p.taskId) return t
          return {
            ...t,
            status: p.status,
            progress: p.progress,
            speed: p.speed ?? t.speed,
            eta: p.eta ?? t.eta,
            filesize: p.total ?? t.filesize,
            filePath: p.outputPath ?? t.filePath,
            title: p.title ?? t.title,
            thumbnail: p.thumbnail ?? t.thumbnail,
            error: p.errorMessage ?? t.error,
          }
        })
      )
    })
    return () => {
      unlistenPromise.then(fn => fn())
    }
  }, [])

  const handleUrlSubmit = async (url: string) => {
    // 乐观插入：点击瞬间先给反馈，避免请求未返回时界面像“没反应”
    const tempId = `local-${Date.now()}`
    setTasks(prev => [
      {
        id: tempId,
        url,
        title: url,
        status: 'pending',
        progress: 0,
        createdAt: Date.now(),
      },
      ...prev,
    ])
    setStatusFilter(null)
    setLoading(true)
    try {
      const id = await startDownload(url, '', cookiesPath)
      // 用后端真实任务 id 替换临时 id（后续进度事件按真实 id 匹配）
      setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, id } : t)))
    } catch (e) {
      setTasks(prev =>
        prev.map(t =>
          t.id === tempId
            ? { ...t, status: 'failed' as const, title: `启动失败：${e}` }
            : t
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  // 失败重试：移除失败卡片后用原 URL 重新发起下载（沿用当前 cookies 设置）
  const handleRetry = (task: DownloadTask) => {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    void handleUrlSubmit(task.url)
  }

  // 登录态失效时打开抖音登录页，登录后回来重试
  const handleOpenLogin = () => {
    void open('https://www.douyin.com')
  }

  const toggleFilter = (filter: Exclude<StatusFilter, null>) => {
    setStatusFilter(prev => (prev === filter ? null : filter))
  }

  const stats = {
    downloading: tasks.filter(t => t.status === 'downloading' || t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  }

  const visibleTasks = statusFilter
    ? tasks.filter(t =>
        statusFilter === 'downloading'
          ? t.status === 'downloading' || t.status === 'pending'
          : t.status === statusFilter
      )
    : tasks

  return (
    <div className="min-h-screen bg-deep-navy relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-electric-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-bright/5 rounded-full blur-3xl" />
      </div>

      {/* 主容器 */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* 头部 */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-5xl font-bold text-fog-white mb-2 tracking-tight">
                Stream<span className="text-electric-cyan">Vault</span>
              </h1>
              <p className="text-slate-muted text-lg">
                极速下载，跨平台视频采集工具
              </p>
            </div>

            {/* 统计卡片 */}
            <div className="flex gap-4">
              <StatCard
                icon={Download}
                label="下载中"
                value={stats.downloading}
                color="text-electric-cyan"
                active={statusFilter === 'downloading'}
                onClick={() => toggleFilter('downloading')}
              />
              <StatCard
                icon={CheckCircle}
                label="已完成"
                value={stats.completed}
                color="text-emerald-400"
                active={statusFilter === 'completed'}
                onClick={() => toggleFilter('completed')}
              />
              <StatCard
                icon={AlertCircle}
                label="失败"
                value={stats.failed}
                color="text-red-400"
                active={statusFilter === 'failed'}
                onClick={() => toggleFilter('failed')}
              />
            </div>
          </div>
        </motion.header>

        {/* 输入区 */}
        <div className="mb-8">
          <UrlInput
            onSubmit={handleUrlSubmit}
            loading={loading}
            cookiesPath={cookiesPath}
            onCookiesChange={setCookiesPath}
          />
        </div>

        {/* 任务列表 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-fog-white">
              {statusFilter ? '筛选结果' : '下载任务'} ({visibleTasks.length})
            </h2>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(null)}
                className="text-sm text-electric-cyan hover:text-sky-bright transition-colors"
              >
                清除筛选 ×
              </button>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {visibleTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-12 text-center"
              >
                <Clock className="w-12 h-12 text-slate-muted mx-auto mb-4" />
                <p className="text-slate-muted text-lg">
                  {statusFilter ? '当前筛选下暂无任务' : '暂无下载任务，粘贴视频链接开始使用'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {visibleTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onRemove={handleRemove}
                    onRetry={handleRetry}
                    onOpenLogin={handleOpenLogin}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 底部信息 */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => open('https://www.douyin.com/user/self?from_tab_name=main')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              open('https://www.douyin.com/user/self?from_tab_name=main')
            }
          }}
          className="glass-card px-6 py-3 flex items-center gap-3 text-sm text-slate-muted cursor-pointer hover:scale-105 hover:text-fog-white transition-all duration-200"
        >
          <span className="font-medium">v0.1.0</span>
          <span className="w-px h-3 bg-slate-muted/30" />
          <Music2 className="w-4 h-4 text-electric-cyan" />
          <span>抖音 <span className="text-fog-white font-medium">@科技矩阵侠</span></span>
        </div>
      </motion.footer>

    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  color: string
  active: boolean
  onClick: () => void
}

function StatCard({ icon: Icon, label, value, color, active, onClick }: StatCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`glass-card px-6 py-4 min-w-[120px] text-left transition-all duration-200 ${
        active ? 'ring-2 ring-electric-cyan/70 shadow-lg shadow-electric-cyan/10' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-slate-muted">{label}</div>
        </div>
      </div>
    </motion.button>
  )
}

export default App
