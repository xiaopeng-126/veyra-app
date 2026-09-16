"use client"

import { AppearanceSettings } from "@/components/local/appearance-settings"
import {
  DEFAULT_SETTINGS,
  backendRequestHeaders,
  loadSettings,
  saveSettings,
  type LocalSettings
} from "@/lib/local-chat/settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCallback, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

/**
 * 本地模式设置。
 *
 * 后端地址与密钥存在浏览器里，随请求头发给 Next 的代理路由；
 * 代理只接受本机地址（127.0.0.1 / localhost），避免变成 SSRF 跳板。
 */

const MODELS = [
  { id: "veyra-agent", label: "Veyra 智能体（带工具）" },
  { id: "veyra-swarm", label: "Veyra 蜂群（多智能体）" }
]

const THEMES = [
  { id: "light", label: "亮色" },
  { id: "dark", label: "暗色" },
  { id: "system", label: "跟随系统" }
]

interface HealthInfo {
  status: string
  database: string
  provider: string
  model: string
}

export default function LocalSettingsPage() {
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS)
  const [testing, setTesting] = useState(false)
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setMounted(true)
  }, [])

  const persist = useCallback((next: LocalSettings) => {
    setSettings(next)
    saveSettings(next)
    toast.success("设置已保存")
  }, [])

  const test = useCallback(async () => {
    setTesting(true)
    setHealth(null)
    try {
      const response = await fetch("/api/veyra/health", {
        headers: backendRequestHeaders(settings),
        cache: "no-store"
      })
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.message || `HTTP ${response.status}`)
      setHealth(body as HealthInfo)
      toast.success("连接正常")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "连接失败")
    } finally {
      setTesting(false)
    }
  }, [settings])

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="veyra-panel border-border/70 border-b px-6 py-3">
        <h1 className="text-base font-semibold">设置</h1>
        <p className="text-muted-foreground/75 text-xs">
          这些配置只保存在这台浏览器里，用来决定前端连哪个后端
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl">
          <Tabs defaultValue="connection">
            <TabsList className="mb-4">
              <TabsTrigger value="connection">后端连接</TabsTrigger>
              <TabsTrigger value="chat">会话默认</TabsTrigger>
              <TabsTrigger value="appearance">外观</TabsTrigger>
              <TabsTrigger value="about">关于</TabsTrigger>
            </TabsList>

            {/* 后端连接 */}
            <TabsContent value="connection" className="flex flex-col gap-4">
              <Card className="veyra-card">
                <CardHeader>
                  <CardTitle className="text-sm">服务地址</CardTitle>
                  <CardDescription className="text-xs">
                    只允许本机地址（127.0.0.1 /
                    localhost）。服务在别的机器上时，请用环境变量 VEYRA_API_URL
                    配置，并自行处理网络暴露与鉴权。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="backend-url">后端地址</Label>
                    <input
                      id="backend-url"
                      className="veyra-field px-3 py-2"
                      value={settings.backendUrl}
                      onChange={e =>
                        setSettings({ ...settings, backendUrl: e.target.value })
                      }
                      placeholder="http://127.0.0.1:8000"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="backend-key">API Key</Label>
                    <input
                      id="backend-key"
                      className="veyra-field px-3 py-2"
                      value={settings.apiKey}
                      onChange={e =>
                        setSettings({ ...settings, apiKey: e.target.value })
                      }
                      placeholder="后端没配 API_KEYS 时留空"
                    />
                  </div>

                  <div>
                    <Button
                      variant="outline"
                      className="mr-2"
                      onClick={() => void test()}
                      disabled={testing}
                    >
                      {testing ? "测试中…" : "测试连接"}
                    </Button>
                    <Button onClick={() => persist(settings)}>保存</Button>
                  </div>

                  {health && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary">状态 {health.status}</Badge>
                      <Badge variant="secondary">
                        数据库 {health.database}
                      </Badge>
                      <Badge variant="secondary">
                        {health.provider} / {health.model}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 会话默认 */}
            <TabsContent value="chat">
              <Card className="veyra-card">
                <CardHeader>
                  <CardTitle className="text-sm">新会话默认模式</CardTitle>
                  <CardDescription className="text-xs">
                    单智能体会按需调用工具；蜂群模式由 Leader
                    拆解任务后分给多个成员协作完成。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Select
                    value={settings.defaultModel}
                    onValueChange={value =>
                      setSettings({ ...settings, defaultModel: value })
                    }
                  >
                    <SelectTrigger className="w-[260px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <Button onClick={() => persist(settings)}>保存</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 外观 */}
            <TabsContent value="appearance">
              <Card className="veyra-card">
                <CardHeader>
                  <CardTitle className="text-sm">主题与背景</CardTitle>
                  <CardDescription className="text-xs">
                    深浅主题跟随系统或手动切换；背景图片、遮罩和面板透明度可以单独调整。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <Label>显示主题</Label>
                    {/* 服务端不知道当前主题，挂载前不渲染选中态，避免水合不一致 */}
                    <Select
                      value={mounted ? theme ?? "system" : "system"}
                      onValueChange={value => setTheme(value)}
                      disabled={!mounted}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEMES.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <AppearanceSettings />
                </CardContent>
              </Card>
            </TabsContent>

            {/* 关于 */}
            <TabsContent value="about">
              <Card className="veyra-card">
                <CardHeader>
                  <CardTitle className="text-sm">关于本地模式</CardTitle>
                  <CardDescription className="text-xs">
                    会话、助手与设置都存在这台浏览器里；检索与生成由本机的
                    Python 后端完成， 不上传任何数据到第三方服务。
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">
                      会话与助手
                    </span>
                    <code className="bg-muted rounded px-1.5 py-0.5">
                      localStorage
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">
                      知识库与用量
                    </span>
                    <code className="bg-muted rounded px-1.5 py-0.5">
                      backend / MySQL
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">接口文档</span>
                    <a
                      className="underline"
                      href={`${settings.backendUrl.replace(/\/+$/, "")}/docs`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {settings.backendUrl}/docs
                    </a>
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => persist(DEFAULT_SETTINGS)}
                    >
                      恢复默认设置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
