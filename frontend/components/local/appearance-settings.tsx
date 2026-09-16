"use client"

import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  APPEARANCE_KEY,
  BACKGROUND_PRESETS,
  CARD_ALPHA_RANGE,
  DEFAULT_APPEARANCE,
  IMAGE_PANEL_STYLE,
  PANEL_ALPHA_RANGE,
  PANEL_STYLES,
  STAGE_ALPHA_RANGE,
  VEIL_RANGE,
  applyAppearance,
  customSwatchColor,
  loadAppearance,
  safeImageUrl,
  saveAppearance,
  surfaceRamp,
  swatchColor,
  type Appearance
} from "@/lib/local-chat/appearance"
import { cn } from "@/lib/utils"
import {
  IconCheck,
  IconChevronDown,
  IconPalette,
  IconPhotoUp,
  IconX
} from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useRef, useState } from "react"

/** data URL 存进 localStorage 会占掉大部分配额，超过这个大小就劝退 */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  formatValue: (value: number) => string
  hint?: string
  onChange: (value: number) => void
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  hint,
  onChange
}: SliderFieldProps) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
          {formatValue(value)}
        </span>
      </span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
      {hint && (
        <span className="text-muted-foreground/75 text-xs leading-relaxed">
          {hint}
        </span>
      )}
    </label>
  )
}

function AppearancePreview({
  appearance,
  mode,
  usingImage
}: {
  appearance: Appearance
  mode: "dark" | "light"
  usingImage: boolean
}) {
  const ramp = surfaceRamp(appearance, mode)
  const image = safeImageUrl(appearance.imageUrl)
  const stageOnly = appearance.coverage === "stage"
  const panelBackground = stageOnly
    ? `hsl(${ramp["--card"]})`
    : `hsl(${ramp["--background"]} / ${appearance.panelAlpha})`
  const cardBackground = stageOnly
    ? `hsl(${ramp["--card"]})`
    : `hsl(${ramp["--card"]} / ${appearance.cardAlpha})`
  const stageBackground = usingImage
    ? `hsl(${ramp["--background"]} / ${appearance.stageAlpha})`
    : "transparent"
  const panelStyle = {
    backgroundColor: panelBackground,
    borderColor: `hsl(${ramp["--border"]})`
  }
  const cardStyle = {
    backgroundColor: cardBackground,
    borderColor: `hsl(${ramp["--border"]})`
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">实时预览</h3>
        <p className="text-muted-foreground/75 mt-1 text-xs">
          参数变化会立即反映在这里
        </p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        {image && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${image.replace(/"/g, '\\"')}")` }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: `hsl(${ramp["--background"]} / ${
              usingImage ? appearance.veil : 1
            })`
          }}
        />

        <div className="relative flex h-full gap-2 p-3">
          <div
            className="flex h-full w-12 shrink-0 flex-col items-center gap-3 rounded-lg border py-3 shadow-sm"
            style={panelStyle}
          >
            <span className="size-4 rounded bg-slate-400/35" />
            <span className="h-2 w-6 rounded-full bg-slate-400/20" />
            <span className="h-2 w-5 rounded-full bg-slate-400/20" />
            <span className="h-2 w-6 rounded-full bg-slate-400/20" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div
              className="h-7 shrink-0 rounded-lg border shadow-sm"
              style={panelStyle}
            />
            <div
              className="flex min-h-0 flex-1 flex-col rounded-lg border p-3"
              style={{
                backgroundColor: stageBackground,
                borderColor: `hsl(${ramp["--border"]})`
              }}
            >
              <div
                className="ml-auto h-9 w-24 rounded-lg border shadow-sm"
                style={cardStyle}
              />
              <div
                className="mt-3 h-16 rounded-lg border shadow-sm"
                style={cardStyle}
              />
              <div
                className="mt-2 h-8 w-4/5 rounded-lg border shadow-sm"
                style={cardStyle}
              />
            </div>
            <div
              className="h-8 shrink-0 rounded-lg border shadow-sm"
              style={cardStyle}
            />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground/75 text-[11px] leading-relaxed">
        预览使用简化的界面结构，用于判断图片、遮罩和面板透明度是否协调。
      </p>
    </div>
  )
}

export function AppearanceSettings() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE)
  const [imageError, setImageError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const { resolvedTheme } = useTheme()
  const mode = resolvedTheme === "light" ? "light" : "dark"

  useEffect(() => {
    setAppearance(loadAppearance())
  }, [])

  /** 外观改动即时生效并落盘，不用再点保存 */
  const commit = useCallback((next: Appearance) => {
    setAppearance(next)
    saveAppearance(next)
    applyAppearance(next)
    // 通知同一标签页里的其他监听者（storage 事件只跨标签页触发）
    window.dispatchEvent(new StorageEvent("storage", { key: APPEARANCE_KEY }))
  }, [])

  /**
   * 设图时帮一下忙：从无图变有图且面板还是完全实心时，自动换成毛玻璃。
   * 完全实心的面板会把图遮得只剩中间一块，默认就给个能看的效果。
   */
  const commitImage = useCallback(
    (imageUrl: string) => {
      const firstImage =
        !safeImageUrl(appearance.imageUrl) && Boolean(safeImageUrl(imageUrl))
      const needsFrost =
        firstImage && appearance.panelAlpha >= 1 && appearance.panelBlur === 0
      commit({
        ...appearance,
        imageUrl,
        ...(needsFrost
          ? {
              coverage: "stage" as const,
              panelAlpha: IMAGE_PANEL_STYLE.panelAlpha,
              cardAlpha: IMAGE_PANEL_STYLE.cardAlpha,
              stageAlpha: IMAGE_PANEL_STYLE.stageAlpha,
              panelBlur: IMAGE_PANEL_STYLE.panelBlur
            }
          : {})
      })
    },
    [appearance, commit]
  )

  const pickFile = useCallback(
    (file: File) => {
      setImageError("")
      if (!file.type.startsWith("image/")) {
        setImageError("请选择图片文件")
        return
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError("图片超过 2MB，浏览器存不下，换张小一点的或改用图片地址")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          commitImage(reader.result)
        }
      }
      reader.onerror = () => setImageError("读取图片失败")
      reader.readAsDataURL(file)
    },
    [commitImage]
  )

  const usingImage = Boolean(safeImageUrl(appearance.imageUrl))

  return (
    <section className="border-border/70 flex flex-col gap-3 border-t pt-5">
      <div>
        <h2 className="text-sm font-medium">背景</h2>
        <p className="text-muted-foreground/75 mt-1 text-xs">
          配色、背景图与面板质感都在这里调
        </p>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="veyra-btn-secondary flex w-fit items-center gap-2 px-3 py-2"
          >
            <IconPalette size={16} stroke={1.75} />
            自定义背景
          </button>
        </DialogTrigger>

        <DialogContent className="appearance-dialog h-[calc(100dvh-24px)] max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] !gap-0 overflow-hidden !p-0 shadow-2xl sm:rounded-2xl">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-5 py-4 text-left">
            <div className="min-w-0">
              <DialogTitle className="text-base">自定义背景</DialogTitle>
              <DialogDescription className="mt-1">
                改动即时生效，只存在这台浏览器里
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="veyra-btn-ghost flex size-8 shrink-0 items-center justify-center"
                aria-label="关闭"
              >
                <IconX size={17} stroke={1.75} />
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="grid min-h-0 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:overflow-hidden">
            <aside className="bg-muted/30 order-first border-b p-5 lg:order-last lg:border-b-0 lg:border-l">
              <AppearancePreview
                appearance={appearance}
                mode={mode}
                usingImage={usingImage}
              />
            </aside>

            <div className="space-y-5 p-5 lg:min-h-0 lg:overflow-y-auto">
              <section className="bg-card space-y-3 rounded-xl border p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                <div>
                  <h3 className="text-sm font-semibold">配色</h3>
                  <p className="text-muted-foreground/75 mt-1 text-xs">
                    选择一个基础色，界面层级会自动生成
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {BACKGROUND_PRESETS.map(preset => {
                    const active = appearance.preset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={preset.label}
                        aria-label={preset.label}
                        aria-pressed={active}
                        onClick={() =>
                          commit({ ...appearance, preset: preset.id })
                        }
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                          active
                            ? "bg-primary/15 text-foreground ring-primary/30 ring-1"
                            : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <span
                          className="ring-border size-4 shrink-0 rounded-[3px] ring-1"
                          style={{ backgroundColor: swatchColor(preset, mode) }}
                        />
                        {preset.label}
                        {active && (
                          <IconCheck
                            size={13}
                            stroke={2}
                            className="text-primary"
                          />
                        )}
                      </button>
                    )
                  })}

                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                      appearance.preset === "custom"
                        ? "bg-primary/15 text-foreground ring-primary/30 ring-1"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    title="自定义底色"
                  >
                    {/* 真正的取色器藏起来：它只能显示原色，而原色在深色下近乎全黑 */}
                    <span
                      className="ring-border size-4 shrink-0 rounded-[3px] ring-1"
                      style={{
                        backgroundColor: customSwatchColor(
                          appearance.customColor,
                          mode
                        )
                      }}
                    />
                    自定义
                    {appearance.preset === "custom" && (
                      <IconCheck
                        size={13}
                        stroke={2}
                        className="text-primary"
                      />
                    )}
                    <input
                      type="color"
                      className="sr-only"
                      value={appearance.customColor}
                      onChange={e =>
                        commit({
                          ...appearance,
                          preset: "custom",
                          customColor: e.target.value
                        })
                      }
                    />
                  </label>
                </div>
                <p className="text-muted-foreground/75 text-xs">
                  自定义色会自动收敛饱和度与明度，保证正文读得清
                </p>
              </section>

              <section className="bg-card space-y-3 rounded-xl border p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                <div>
                  <h3 className="text-sm font-semibold">背景图</h3>
                  <p className="text-muted-foreground/75 mt-1 text-xs">
                    支持图片地址或不超过 2MB 的本地图片
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="veyra-field min-w-0 flex-1 px-3 py-2"
                    placeholder="粘贴图片地址，或点右边选本地图片"
                    value={
                      appearance.imageUrl.startsWith("data:")
                        ? "（本地图片）"
                        : appearance.imageUrl
                    }
                    readOnly={appearance.imageUrl.startsWith("data:")}
                    onChange={e => {
                      setImageError("")
                      commitImage(e.target.value)
                    }}
                  />
                  <button
                    type="button"
                    className="veyra-btn-ghost flex size-9 shrink-0 items-center justify-center"
                    onClick={() => fileRef.current?.click()}
                    title="选择本地图片"
                    aria-label="选择本地图片"
                  >
                    <IconPhotoUp size={16} stroke={1.75} />
                  </button>
                  {appearance.imageUrl && (
                    <button
                      type="button"
                      className="veyra-btn-ghost flex size-9 shrink-0 items-center justify-center"
                      onClick={() => {
                        setImageError("")
                        commit({ ...appearance, imageUrl: "" })
                      }}
                      title="移除背景图"
                      aria-label="移除背景图"
                    >
                      <IconX size={16} stroke={1.75} />
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) pickFile(file)
                      e.target.value = ""
                    }}
                  />
                </div>
                {imageError && (
                  <p className="text-destructive text-xs">{imageError}</p>
                )}
                {appearance.imageUrl && !usingImage && !imageError && (
                  <p className="text-destructive text-xs">
                    只支持 http(s) 开头的地址或本地图片
                  </p>
                )}
              </section>

              {usingImage && (
                <section className="bg-card space-y-4 rounded-xl border p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                  <div>
                    <h3 className="text-sm font-semibold">画面显示</h3>
                    <p className="text-muted-foreground/75 mt-1 text-xs">
                      所有参数开放 0–100%：向左完全透出背景，向右完全覆盖背景
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">背景范围</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        aria-pressed={appearance.coverage === "stage"}
                        onClick={() =>
                          commit({ ...appearance, coverage: "stage" })
                        }
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-colors",
                          appearance.coverage === "stage"
                            ? "border-brand/30 bg-brand/[0.06]"
                            : "border-border/70 bg-background hover:bg-muted/60"
                        )}
                      >
                        <span className="block text-sm font-medium">
                          仅对话区
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-[11px]">
                          侧栏、顶栏和输入区保持实体白底
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={appearance.coverage === "full"}
                        onClick={() =>
                          commit({ ...appearance, coverage: "full" })
                        }
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition-colors",
                          appearance.coverage === "full"
                            ? "border-brand/30 bg-brand/[0.06]"
                            : "border-border/70 bg-background hover:bg-muted/60"
                        )}
                      >
                        <span className="block text-sm font-medium">
                          全屏沉浸
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-[11px]">
                          背景铺满应用，面板保持透明但不模糊
                        </span>
                      </button>
                    </div>
                  </div>

                  <SliderField
                    label="遮罩浓度"
                    value={appearance.veil}
                    min={VEIL_RANGE[0]}
                    max={VEIL_RANGE[1]}
                    step={0.01}
                    formatValue={value => `${Math.round(value * 100)}%`}
                    hint="越高图片越淡，正文越清晰"
                    onChange={value => commit({ ...appearance, veil: value })}
                  />

                  {appearance.coverage === "stage" && (
                    <SliderField
                      label="对话区底衬"
                      value={appearance.stageAlpha}
                      min={STAGE_ALPHA_RANGE[0]}
                      max={STAGE_ALPHA_RANGE[1]}
                      step={0.01}
                      formatValue={value => `${Math.round(value * 100)}%`}
                      hint="越高图片越淡，消息正文和代码块越清晰"
                      onChange={value =>
                        commit({ ...appearance, stageAlpha: value })
                      }
                    />
                  )}

                  {appearance.coverage === "full" && (
                    <>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">面板质感</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {PANEL_STYLES.map(style => {
                            const active =
                              Math.abs(
                                appearance.panelAlpha - style.panelAlpha
                              ) < 0.02 &&
                              Math.abs(appearance.cardAlpha - style.cardAlpha) <
                                0.02 &&
                              Math.abs(
                                appearance.stageAlpha - style.stageAlpha
                              ) < 0.02 &&
                              appearance.panelBlur === style.panelBlur
                            return (
                              <button
                                key={style.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                  commit({
                                    ...appearance,
                                    panelAlpha: style.panelAlpha,
                                    cardAlpha: style.cardAlpha,
                                    stageAlpha: style.stageAlpha,
                                    panelBlur: style.panelBlur
                                  })
                                }
                                className={cn(
                                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                                  active
                                    ? "bg-brand/10 text-brand ring-brand/20 ring-1"
                                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                              >
                                {style.label}
                                {active && (
                                  <IconCheck
                                    size={13}
                                    stroke={2}
                                    className="text-brand"
                                  />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <details className="bg-background/60 group rounded-lg border">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                          微调面板参数
                          <IconChevronDown
                            size={15}
                            stroke={1.75}
                            className="text-muted-foreground transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <div className="space-y-4 border-t p-4">
                          <SliderField
                            label="面板不透明度"
                            value={appearance.panelAlpha}
                            min={PANEL_ALPHA_RANGE[0]}
                            max={PANEL_ALPHA_RANGE[1]}
                            step={0.01}
                            formatValue={value => `${Math.round(value * 100)}%`}
                            hint="导航、侧栏、顶栏与输入区"
                            onChange={value =>
                              commit({ ...appearance, panelAlpha: value })
                            }
                          />
                          <SliderField
                            label="气泡不透明度"
                            value={appearance.cardAlpha}
                            min={CARD_ALPHA_RANGE[0]}
                            max={CARD_ALPHA_RANGE[1]}
                            step={0.01}
                            formatValue={value => `${Math.round(value * 100)}%`}
                            hint="消息气泡、卡片与代码块"
                            onChange={value =>
                              commit({ ...appearance, cardAlpha: value })
                            }
                          />
                          <SliderField
                            label="对话区底衬"
                            value={appearance.stageAlpha}
                            min={STAGE_ALPHA_RANGE[0]}
                            max={STAGE_ALPHA_RANGE[1]}
                            step={0.01}
                            formatValue={value => `${Math.round(value * 100)}%`}
                            hint="消息区域与背景图之间的过渡层"
                            onChange={value =>
                              commit({ ...appearance, stageAlpha: value })
                            }
                          />
                        </div>
                      </details>
                    </>
                  )}
                </section>
              )}

              <div className="border-t pt-4">
                <button
                  type="button"
                  className="text-muted-foreground/75 hover:text-foreground text-sm underline"
                  onClick={() => {
                    setImageError("")
                    commit(DEFAULT_APPEARANCE)
                  }}
                >
                  恢复默认背景
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
