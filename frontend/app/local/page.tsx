"use client"

import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import {
  loadAssistants,
  type Assistant,
  type PromptTemplate
} from "@/lib/local-chat/assistants"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { backendRequestHeaders, loadSettings } from "@/lib/local-chat/settings"
import {
  createSession,
  loadState,
  newId,
  saveState,
  titleFrom,
  toMarkdown,
  type LocalChatState,
  type LocalMessage,
  type LocalSession
} from "@/lib/local-chat/store"
import { cn } from "@/lib/utils"
import {
  IconAlertTriangle,
  IconChartBar,
  IconCopy,
  IconDatabase,
  IconDownload,
  IconDotsVertical,
  IconLoader2,
  IconMenu2,
  IconMessage,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSettings,
  IconSparkles,
  IconTrash,
  IconUser,
  IconUsers,
  IconX
} from "@tabler/icons-react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

/**
 * 本地模式对话页：不依赖 Supabase，也不需要登录。
 *
 * 浏览器 → /api/chat/veyra（本仓库的 Next 路由）→ Python 后端（backend/）。
 * 会话与消息存在浏览器 localStorage，后端另外维护自己的历史用于多轮上下文。
 */

const MODELS = [
  { id: "veyra-agent", label: "Veyra 智能体（带工具）" },
  { id: "veyra-swarm", label: "Veyra 蜂群（多智能体）" }
]

/**
 * Markdown 渲染器按需加载。
 *
 * react-markdown + 语法高亮加起来有几百 KB，直接静态引入会把它们塞进首屏包；
 * 对话页首屏其实只有输入框和空状态，等真有回答要渲染时再拉这个 chunk。
 */
const MessageMarkdown = dynamic(
  () =>
    import("@/components/messages/message-markdown").then(
      mod => mod.MessageMarkdown
    ),
  {
    ssr: false,
    loading: () => <span className="text-muted-foreground">…</span>
  }
)

export default function LocalChatPage() {
  const router = useRouter()
  const [state, setState] = useState<LocalChatState>({
    sessions: [],
    activeId: null
  })
  const [input, setInput] = useState("")
  const [model, setModel] = useState(MODELS[0].id)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [assistantId, setAssistantId] = useState("")
  const [pendingDelete, setPendingDelete] = useState<LocalSession | null>(null)
  const [hydrated, setHydrated] = useState(false)
  // 窄屏下会话列表收成抽屉，这个只控制它的开合
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 首次进入：读本地会话；一个都没有就建一个
  useEffect(() => {
    // 新会话的默认模式来自设置页
    const settings = loadSettings()
    if (settings.defaultModel) setModel(settings.defaultModel)

    // 助手与提示词模板来自 /local/assistants 页的配置
    const configured = loadAssistants()
    setAssistants(configured.assistants)
    setPrompts(configured.prompts)

    const loaded = loadState()
    if (loaded.sessions.length === 0) {
      const session = createSession()
      setState({ sessions: [session], activeId: session.id })
    } else {
      const activeId =
        loaded.activeId && loaded.sessions.some(s => s.id === loaded.activeId)
          ? loaded.activeId
          : loaded.sessions[0].id
      setState({ sessions: loaded.sessions, activeId })
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  const active = useMemo(
    () => state.sessions.find(s => s.id === state.activeId) ?? null,
    [state]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [active?.messages.length, active?.id])

  const patchSession = useCallback(
    (id: string, patch: (session: LocalSession) => LocalSession) => {
      setState(current => ({
        ...current,
        sessions: current.sessions.map(s => (s.id === id ? patch(s) : s))
      }))
    },
    []
  )

  const addSession = useCallback(() => {
    const session = createSession()
    setState(current => ({
      sessions: [session, ...current.sessions],
      activeId: session.id
    }))
    setError("")
  }, [])

  const removeSession = useCallback((id: string) => {
    setState(current => {
      const sessions = current.sessions.filter(s => s.id !== id)
      if (sessions.length === 0) {
        const fresh = createSession()
        return { sessions: [fresh], activeId: fresh.id }
      }
      return {
        sessions,
        activeId: current.activeId === id ? sessions[0].id : current.activeId
      }
    })
  }, [])

  const exportSession = useCallback((session: LocalSession) => {
    const blob = new Blob([toMarkdown(session)], {
      type: "text/markdown;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${session.title.replace(/[\\/:*?"<>|]/g, "_") || "对话"}.md`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [])

  /**
   * 跑一轮对话。
   *
   * history 由调用方给出（已经包含本轮的提问）：
   * - 正常发送：追加一条新的用户消息
   * - 重新生成：传截断后的历史（结尾仍是原来那条用户消息，不重复追加）
   */
  const send = useCallback(
    async (question: string, history: LocalMessage[]) => {
      if (!question.trim() || streaming || !active) return

      const assistantMessage: LocalMessage = {
        id: newId(),
        role: "assistant",
        content: ""
      }
      const sessionId = active.id
      const assistant = assistants.find(a => a.id === assistantId)

      patchSession(sessionId, session => ({
        ...session,
        // 第一条用户消息顺便给会话命名
        title:
          session.messages.length === 0 ? titleFrom(question) : session.title,
        updatedAt: Date.now(),
        messages: [...history, assistantMessage]
      }))
      setInput("")
      setStreaming(true)
      setError("")

      try {
        const response = await fetch("/api/chat/veyra", {
          method: "POST",
          // 带上前端设置里的后端地址与密钥（见 lib/veyra-backend.ts）
          headers: backendRequestHeaders(loadSettings()),
          body: JSON.stringify({
            chatSettings: { model, temperature: 0.5 },
            system_prompt: assistant?.systemPrompt || undefined,
            // 首条消息的 id 决定后端会话，从而决定多轮上下文
            messages: history.map(m => ({
              id: m.id,
              role: m.role,
              content: m.content
            }))
          })
        })

        if (!response.ok || !response.body) {
          const detail = (await response
            .json()
            .catch(() => ({ message: "" }))) as { message?: string }
          throw new Error(
            detail.message || `请求失败（HTTP ${response.status}）`
          )
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          patchSession(sessionId, session => ({
            ...session,
            messages: session.messages.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          }))
        }
      } catch (e) {
        // 请求失败时不要留下一条孤立的空助手消息，否则错误提示会显得很杂乱。
        patchSession(sessionId, session => ({
          ...session,
          messages: session.messages.filter(
            message => message.id !== assistantMessage.id
          )
        }))
        setError(e instanceof Error ? e.message : "请求失败")
      } finally {
        setStreaming(false)
      }
    },
    [active, assistantId, assistants, model, patchSession, streaming]
  )

  /**
   * 重新生成：删掉这条回答，用它上面的用户提问重跑一轮。
   * 用户消息保持原样，这样会话历史里的上下文不会乱。
   */
  const regenerate = useCallback(
    async (assistantMessageId: string) => {
      if (streaming || !active) return
      const index = active.messages.findIndex(m => m.id === assistantMessageId)
      if (index < 0) return

      const question = [...active.messages.slice(0, index)]
        .reverse()
        .find(m => m.role === "user")?.content
      if (!question) return

      // 历史截到这条回答之前（结尾正是那条用户提问），不重复追加用户消息
      await send(question, active.messages.slice(0, index))
    },
    [active, send, streaming]
  )

  /** 输入框提交：把这条提问追加进历史后交给 send */
  const submit = useCallback(() => {
    if (!active) return
    const question = input.trim()
    if (!question || streaming) return
    const userMessage: LocalMessage = {
      id: newId(),
      role: "user",
      content: question
    }
    void send(question, [...active.messages, userMessage])
  }, [active, input, send, streaming])

  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success("已复制到剪贴板")
    } catch {
      toast.error("复制失败，请手动选择文本")
    }
  }, [])

  /** 快捷键：⌘/Ctrl+K 打开会话面板，⌘/Ctrl+N 新建会话 */
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen(open => !open)
      }
      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault()
        addSession()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [addSession])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative flex min-w-0 flex-1 overflow-hidden">
        {/* 窄屏抽屉打开时的遮罩，点一下关掉 */}
        <button
          aria-label="关闭会话列表"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "absolute inset-0 z-20 bg-black/50 transition-opacity md:hidden",
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />

        {/* 会话列表：宽屏常驻，窄屏从左侧滑出 */}
        <aside
          className={cn(
            "veyra-panel bg-card border-border/70 flex w-64 shrink-0 flex-col border-r",
            "max-md:bg-card max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:shadow-xl max-md:transition-transform",
            sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
          )}
        >
          <div className="border-border/70 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none">
                Veyra
              </p>
              <p className="text-muted-foreground/75 mt-1.5 text-[11px] leading-none">
                本地模式
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className="text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded px-1.5 py-1 text-[10px] transition-colors"
                onClick={() => setPaletteOpen(true)}
                title="会话搜索与跳转（⌘/Ctrl + K）"
              >
                ⌘K
              </button>
              <button
                className="bg-secondary text-foreground hover:bg-accent flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40"
                onClick={addSession}
                onClickCapture={() => setSidebarOpen(false)}
                title="新对话（⌘/Ctrl + N）"
                disabled={streaming}
              >
                <IconPlus size={15} stroke={1.75} />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {state.sessions.map(session => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
                    session.id === state.activeId
                      ? "bg-brand/[0.07] text-foreground ring-brand/10 ring-1 ring-inset"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {renamingId === session.id ? (
                    <input
                      autoFocus
                      className="veyra-field min-w-0 flex-1 rounded-[4px] px-1.5 py-0.5 text-sm"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          patchSession(session.id, s => ({
                            ...s,
                            title: titleFrom(renameValue, 40)
                          }))
                          setRenamingId(null)
                        } else if (e.key === "Escape") {
                          setRenamingId(null)
                        }
                      }}
                      onBlur={() => setRenamingId(null)}
                    />
                  ) : (
                    <>
                      <button
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => {
                          setState(current => ({
                            ...current,
                            activeId: session.id
                          }))
                          setSidebarOpen(false)
                        }}
                        title={session.title}
                      >
                        {session.title}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="hover:bg-background rounded p-0.5 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                            title="更多操作"
                          >
                            <IconDotsVertical size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => {
                              setRenamingId(session.id)
                              setRenameValue(session.title)
                            }}
                          >
                            <IconPencil size={14} className="mr-2" />
                            重命名
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportSession(session)}
                          >
                            <IconDownload size={14} className="mr-2" />
                            导出 Markdown
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingDelete(session)}
                          >
                            <IconTrash size={14} className="mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <p className="text-muted-foreground/75 border-border/70 shrink-0 border-t px-3 py-2.5 text-[11px] leading-relaxed">
            本地模式：无需登录，会话存在这台浏览器里。
          </p>
        </aside>

        {/* 对话区 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="veyra-panel bg-card border-border/70 flex shrink-0 flex-col gap-2 border-b px-4 py-2.5 md:px-6 lg:h-14 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:py-0">
            <div className="flex min-w-0 items-center gap-3 lg:flex-1">
              <button
                className="veyra-btn-ghost flex size-8 shrink-0 items-center justify-center md:hidden"
                onClick={() => setSidebarOpen(true)}
                title="会话列表"
                aria-label="打开会话列表"
              >
                <IconMenu2 size={15} stroke={1.75} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-semibold leading-none">
                  {active?.title ?? "新对话"}
                </h1>
                <p className="text-muted-foreground/75 mt-1.5 hidden truncate text-[11px] leading-none lg:block">
                  知识库检索 · 工具调用 · 多智能体，均由本机 Python 后端执行
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:shrink-0">
              {/* Radix Select 不接受空字符串作为 value，所以「不使用助手」用 none 这个哨兵值 */}
              <Select
                value={assistantId || "none"}
                onValueChange={value => {
                  const id = value === "none" ? "" : value
                  setAssistantId(id)
                  // 选中助手时同时切换它预设的模型档位
                  const picked = assistants.find(a => a.id === id)
                  if (picked?.model) setModel(picked.model)
                }}
                disabled={streaming}
              >
                <SelectTrigger
                  className="h-8 min-w-0 flex-1 text-xs lg:w-[168px] lg:flex-none"
                  title="选择一个助手（角色设定会发给后端）"
                >
                  <SelectValue placeholder="不使用助手" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    不使用助手
                  </SelectItem>
                  {assistants.map(assistant => (
                    <SelectItem
                      key={assistant.id}
                      value={assistant.id}
                      className="text-xs"
                    >
                      {assistant.emoji} {assistant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={model}
                onValueChange={setModel}
                disabled={streaming}
              >
                <SelectTrigger
                  className="h-8 min-w-0 flex-1 text-xs lg:w-[184px] lg:flex-none"
                  title="选择运行模式"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="veyra-btn-ghost flex size-8 shrink-0 items-center justify-center"
                    onClick={() => active && exportSession(active)}
                    disabled={!active?.messages.length}
                  >
                    <IconDownload size={15} stroke={1.75} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>把当前会话导出成 Markdown 文件</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <ScrollArea className="flex-1">
            <main className="veyra-stage bg-background px-4 py-6 md:px-8 md:py-7">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                {!active?.messages.length && (
                  <div className="veyra-card border-border/70 bg-card/85 mt-10 flex w-full items-start gap-3 rounded-xl border p-4 text-left shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
                    <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <IconSparkles size={17} stroke={1.7} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium">开始一段新对话</p>
                      <p className="text-muted-foreground/75 mt-1 text-xs leading-relaxed">
                        回答会自动带上知识库来源（形如
                        [S1]）；顶部可以切换助手与模型档位。
                      </p>
                    </div>
                  </div>
                )}

                {active?.messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      "group/message flex flex-col gap-1",
                      message.role === "user"
                        ? "veyra-card bg-card border-border/70 ml-auto max-w-[78%] rounded-2xl border px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                        : "mr-auto max-w-full pt-0.5"
                    )}
                  >
                    <div className="flex h-5 items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {message.role === "user" ? "你" : "Veyra"}
                      </span>
                      {/* 悬停才出现操作，避免平时干扰阅读 */}
                      {message.content && !streaming && (
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100">
                          <button
                            className="hover:bg-accent rounded p-0.5"
                            title="复制这条消息"
                            onClick={() => void copyMessage(message.content)}
                          >
                            <IconCopy size={13} />
                          </button>
                          {message.role === "assistant" && (
                            <button
                              className="hover:bg-accent rounded p-0.5"
                              title="用同一个提问重新生成"
                              onClick={() => void regenerate(message.id)}
                            >
                              <IconRefresh size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm leading-relaxed">
                      {message.role === "assistant" ? (
                        message.content ? (
                          <MessageMarkdown content={message.content} />
                        ) : (
                          <span className="border-border/60 bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                            <IconLoader2 size={14} className="animate-spin" />
                            思考中…
                          </span>
                        )
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {error && (
                  <div className="border-destructive/20 bg-destructive/5 text-destructive flex w-fit max-w-full items-start gap-2 rounded-md border px-3 py-2 text-xs">
                    <IconAlertTriangle
                      size={14}
                      stroke={1.75}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{error}</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </main>
          </ScrollArea>

          <footer className="veyra-panel bg-card border-border/70 shrink-0 border-t p-4 md:px-8">
            {prompts.length > 0 && (
              <div className="mx-auto mb-2.5 flex w-full max-w-3xl flex-wrap gap-1.5">
                {prompts.map(prompt => (
                  <button
                    key={prompt.id}
                    className="border-border/70 bg-card text-muted-foreground hover:border-brand/30 hover:bg-brand/[0.04] hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors"
                    title={prompt.content}
                    onClick={() =>
                      setInput(current =>
                        current.trim()
                          ? `${current.trim()}\n${prompt.content}`
                          : prompt.content
                      )
                    }
                  >
                    {prompt.name}
                  </button>
                ))}
              </div>
            )}

            <div className="border-border/80 bg-card focus-within:border-ring/70 focus-within:ring-ring/15 mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border p-2 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all focus-within:ring-2">
              <TextareaAutosize
                className="!border-0 !bg-transparent p-1.5 focus-visible:!ring-0 focus-visible:!ring-offset-0"
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                value={input}
                onValueChange={setInput}
                minRows={1}
                maxRows={8}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    submit()
                  }
                }}
              />
              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-30"
                onClick={submit}
                disabled={streaming || !input.trim()}
                title={streaming ? "生成中…" : "发送"}
              >
                {streaming ? (
                  <IconLoader2
                    size={16}
                    stroke={1.75}
                    className="animate-spin"
                  />
                ) : (
                  <IconSend size={16} stroke={1.75} />
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>

      {/* 删除会话前确认：会话存在浏览器里，删掉就找不回来了 */}
      {/* 会话搜索与页面跳转：⌘/Ctrl + K */}
      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="搜索会话，或跳到某个页面…" />
        <CommandList>
          <CommandEmpty>没有匹配的内容</CommandEmpty>

          <CommandGroup heading="会话">
            {state.sessions.map(session => (
              <CommandItem
                key={session.id}
                value={`${session.title} ${session.id}`}
                onSelect={() => {
                  setState(current => ({ ...current, activeId: session.id }))
                  setPaletteOpen(false)
                }}
              >
                <IconMessage size={14} className="mr-2" />
                <span className="truncate">{session.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="操作">
            <CommandItem
              onSelect={() => {
                addSession()
                setPaletteOpen(false)
              }}
            >
              <IconPlus size={14} className="mr-2" />
              新建会话
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            {[
              { href: "/local/kb", label: "知识库", icon: IconDatabase },
              {
                href: "/local/assistants",
                label: "助手与提示词",
                icon: IconUsers
              },
              { href: "/local/usage", label: "用量统计", icon: IconChartBar },
              { href: "/local/settings", label: "设置", icon: IconSettings }
            ].map(item => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  router.push(item.href)
                  setPaletteOpen(false)
                }}
              >
                <item.icon size={14} className="mr-2" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除这个会话？</AlertDialogTitle>
            <AlertDialogDescription>
              「{pendingDelete?.title}
              」里的对话记录会从这台浏览器移除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) removeSession(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
