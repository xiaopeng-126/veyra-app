"use client"

import {
  createAssistant,
  createPrompt,
  loadAssistants,
  saveAssistants,
  type Assistant,
  type AssistantsState,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const MODELS = [
  { id: "veyra-agent", label: "Veyra 智能体（带工具）" },
  { id: "veyra-swarm", label: "Veyra 蜂群（多智能体）" }
]

/**
 * 助手与提示词管理。
 *
 * 助手 = 角色设定 + 默认模型；提示词 = 一段可复用的指令文本。
 * 都存浏览器本地；会话里选中助手后，角色设定会作为系统提示词发给后端。
 */
export default function AssistantsPage() {
  const [state, setState] = useState<AssistantsState>({
    assistants: [],
    prompts: []
  })
  const [hydrated, setHydrated] = useState(false)
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(
    null
  )
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(
    null
  )
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "assistant" | "prompt"
    id: string
    name: string
  } | null>(null)

  useEffect(() => {
    setState(loadAssistants())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveAssistants(state)
  }, [state, hydrated])

  const upsertAssistant = useCallback((assistant: Assistant) => {
    setState(current => {
      const exists = current.assistants.some(a => a.id === assistant.id)
      return {
        ...current,
        assistants: exists
          ? current.assistants.map(a => (a.id === assistant.id ? assistant : a))
          : [...current.assistants, assistant]
      }
    })
    setEditingAssistant(null)
    toast.success("助手已保存")
  }, [])

  const upsertPrompt = useCallback((prompt: PromptTemplate) => {
    setState(current => {
      const exists = current.prompts.some(p => p.id === prompt.id)
      return {
        ...current,
        prompts: exists
          ? current.prompts.map(p => (p.id === prompt.id ? prompt : p))
          : [...current.prompts, prompt]
      }
    })
    setEditingPrompt(null)
    toast.success("提示词已保存")
  }, [])

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return
    const target = pendingDelete
    setState(current =>
      target.kind === "assistant"
        ? {
            ...current,
            assistants: current.assistants.filter(a => a.id !== target.id)
          }
        : {
            ...current,
            prompts: current.prompts.filter(p => p.id !== target.id)
          }
    )
    toast.success(`已删除：${target.name}`)
    setPendingDelete(null)
  }, [pendingDelete])

  const modelLabel = (id: string): string =>
    MODELS.find(m => m.id === id)?.label ?? id

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="veyra-panel border-border/70 border-b px-6 py-3">
        <h1 className="text-base font-semibold">助手与提示词</h1>
        <p className="text-muted-foreground/75 text-xs">
          助手 = 角色设定 +
          默认模型，在会话顶部选中后生效；提示词模板会在会话底部提供快捷按钮。
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                助手（{state.assistants.length}）
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingAssistant(createAssistant())}
              >
                <IconPlus size={14} className="mr-1" />
                新增助手
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {state.assistants.map(assistant => (
                <Card key={assistant.id} className="veyra-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">
                          {assistant.emoji} {assistant.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          <Badge variant="secondary" className="text-[11px]">
                            {modelLabel(assistant.model)}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          title="编辑助手"
                          onClick={() => setEditingAssistant(assistant)}
                        >
                          <IconPencil size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive size-7"
                          title="删除助手"
                          onClick={() =>
                            setPendingDelete({
                              kind: "assistant",
                              id: assistant.id,
                              name: assistant.name
                            })
                          }
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                      {assistant.systemPrompt || "（还没有角色设定）"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                提示词模板（{state.prompts.length}）
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingPrompt(createPrompt())}
              >
                <IconPlus size={14} className="mr-1" />
                新增提示词
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {state.prompts.map(prompt => (
                <Card key={prompt.id} className="veyra-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate text-sm">
                        {prompt.name}
                      </CardTitle>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          title="编辑提示词"
                          onClick={() => setEditingPrompt(prompt)}
                        >
                          <IconPencil size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive size-7"
                          title="删除提示词"
                          onClick={() =>
                            setPendingDelete({
                              kind: "prompt",
                              id: prompt.id,
                              name: prompt.name
                            })
                          }
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
                      {prompt.content || "（还没有内容）"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={editingAssistant !== null}
        onOpenChange={open => {
          if (!open) setEditingAssistant(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑助手</DialogTitle>
            <DialogDescription>
              角色设定会作为系统提示词发给后端，决定这个助手回答时的身份与规则。
            </DialogDescription>
          </DialogHeader>

          {editingAssistant && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex w-20 flex-col gap-1.5">
                  <Label htmlFor="assistant-emoji">图标</Label>
                  <input
                    id="assistant-emoji"
                    className="veyra-field px-3 py-2 text-center"
                    value={editingAssistant.emoji}
                    maxLength={2}
                    onChange={e =>
                      setEditingAssistant({
                        ...editingAssistant,
                        emoji: e.target.value
                      })
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="assistant-name">名称</Label>
                  <input
                    id="assistant-name"
                    className="veyra-field px-3 py-2"
                    value={editingAssistant.name}
                    onChange={e =>
                      setEditingAssistant({
                        ...editingAssistant,
                        name: e.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>默认模型档位</Label>
                <Select
                  value={editingAssistant.model}
                  onValueChange={value =>
                    setEditingAssistant({ ...editingAssistant, model: value })
                  }
                >
                  <SelectTrigger>
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
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="assistant-prompt">角色设定</Label>
                <textarea
                  id="assistant-prompt"
                  className="veyra-field min-h-[140px] px-3 py-2"
                  placeholder="例如：你是严谨的技术评审，区分结论与推测"
                  value={editingAssistant.systemPrompt}
                  onChange={e =>
                    setEditingAssistant({
                      ...editingAssistant,
                      systemPrompt: e.target.value
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssistant(null)}>
              取消
            </Button>
            <Button
              onClick={() =>
                editingAssistant && upsertAssistant(editingAssistant)
              }
              disabled={!editingAssistant?.name.trim()}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingPrompt !== null}
        onOpenChange={open => {
          if (!open) setEditingPrompt(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑提示词</DialogTitle>
            <DialogDescription>
              提示词会出现在会话底部的快捷按钮里，点一下追加到输入框。
            </DialogDescription>
          </DialogHeader>

          {editingPrompt && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prompt-name">名称</Label>
                <input
                  id="prompt-name"
                  className="veyra-field px-3 py-2"
                  value={editingPrompt.name}
                  onChange={e =>
                    setEditingPrompt({ ...editingPrompt, name: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="prompt-content">内容</Label>
                <textarea
                  id="prompt-content"
                  className="veyra-field min-h-[120px] px-3 py-2"
                  placeholder="例如：把上面的内容总结成不超过五条要点"
                  value={editingPrompt.content}
                  onChange={e =>
                    setEditingPrompt({
                      ...editingPrompt,
                      content: e.target.value
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrompt(null)}>
              取消
            </Button>
            <Button
              onClick={() => editingPrompt && upsertPrompt(editingPrompt)}
              disabled={!editingPrompt?.name.trim()}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除{pendingDelete?.kind === "assistant" ? "助手" : "提示词"}？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`「${pendingDelete?.name ?? ""}」会从这台浏览器移除，无法恢复。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
