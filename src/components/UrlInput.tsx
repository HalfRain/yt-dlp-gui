import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Loader2, Link as LinkIcon, Cookie } from 'lucide-react'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import bilibiliIcon from '../assets/platform-icons/bilibili.svg'
import youtubeIcon from '../assets/platform-icons/youtube.svg'
import douyinIcon from '../assets/platform-icons/douyin.svg'
import weiboIcon from '../assets/platform-icons/weibo.svg'
import xiaohongshuIcon from '../assets/platform-icons/xiaohongshu.svg'

const PLATFORMS = [
  { name: 'Bilibili', icon: bilibiliIcon },
  { name: 'YouTube', icon: youtubeIcon },
  { name: '抖音', icon: douyinIcon },
  { name: '微博', icon: weiboIcon },
  { name: '小红书', icon: xiaohongshuIcon },
]

interface UrlInputProps {
  onSubmit: (url: string) => void
  loading?: boolean
  cookiesPath?: string
  onCookiesChange?: (path: string) => void
}

export default function UrlInput({ onSubmit, loading, cookiesPath, onCookiesChange }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [focused, setFocused] = useState(false)

  const pickCookies = async () => {
    const file = await openDialog({ filters: [{ name: 'Cookies', extensions: ['txt'] }] })
    if (typeof file === 'string' && file) onCookiesChange?.(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || loading) return
    onSubmit(url.trim())
    setUrl('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <form onSubmit={handleSubmit} className="glass-card p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <motion.div
              animate={{
                scale: focused ? 1.02 : 1,
              }}
              className="relative"
            >
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-muted" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="粘贴视频链接 (支持 Bilibili、YouTube...)"
                className="input-primary pl-12"
                disabled={loading}
              />
            </motion.div>

            {/* 动态边框效果 */}
            {focused && (
              <motion.div
                layoutId="input-border"
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  border: '2px solid',
                  borderImage: 'linear-gradient(90deg, #22D3EE, #38BDF8) 1',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </div>

          <motion.button
            type="submit"
            disabled={!url.trim() || loading}
            className="btn-primary min-w-[140px] flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                解析中
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                开始下载
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            onClick={pickCookies}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass-card px-4 min-w-[120px] flex items-center justify-center gap-2 text-slate-muted hover:text-fog-white transition-colors"
            title={cookiesPath || '选择 cookies 文件（抖音等需要登录态的平台需要）'}
          >
            <Cookie className="w-5 h-5" />
            <span className="max-w-[140px] truncate">
              {cookiesPath ? cookiesPath.split('/').pop() : 'Cookies'}
            </span>
          </motion.button>
        </div>

        {/* 支持的平台提示 */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 flex flex-wrap gap-2"
        >
          {PLATFORMS.map((platform) => (
            <span
              key={platform.name}
              className="px-3 py-1 text-xs bg-graphite/60 text-slate-muted rounded-full
                         border border-slate-border/30 flex items-center gap-1.5"
            >
              <img
                src={platform.icon}
                alt=""
                aria-hidden="true"
                className="w-4 h-4 rounded-[3px] object-contain bg-white/90 p-px"
              />
              {platform.name}
            </span>
          ))}
        </motion.div>
      </form>
    </motion.div>
  )
}
