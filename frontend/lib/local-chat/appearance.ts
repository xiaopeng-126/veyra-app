/**
 * 本地模式的外观设置：背景配色与可选背景图。
 *
 * 只存在浏览器里，不参与任何后端请求。生效方式是把一组中性色阶写到
 * documentElement 的内联 CSS 变量上，覆盖 globals.css 里的默认值，
 * 因此不需要改动任何组件的 className。
 */

export interface Appearance {
  /** 背景图可见范围：只铺对话区，或铺满整个应用 */
  coverage: "stage" | "full"
  /** 预设 id，或 "custom" 表示用 customColor 推导 */
  preset: string
  /** 自定义底色，#rrggbb */
  customColor: string
  /** 背景图地址，留空表示纯色 */
  imageUrl: string
  /** 背景图上的遮罩浓度，0.35 - 0.95；越大越不透明，正文越清晰 */
  veil: number
  /** 导航、侧标、header、输入区这些面板的不透明度 */
  panelAlpha: number
  /** 消息气泡与卡片的不透明度 */
  cardAlpha: number
  /** 对话区底衬的不透明度：0 就是裸图，高一点让消息区有承托 */
  stageAlpha: number
  /** 面板背后的模糊半径，px */
  panelBlur: number
}

export interface BackgroundPreset {
  id: string
  label: string
  hue: number
  saturation: number
  /** 深色主题下的底色亮度 */
  darkLightness: number
  /** 浅色主题下的底色亮度 */
  lightLightness: number
  /** 色板预览用的饱和度：底色太暗认不出色系，预览要提亮提饱和 */
  swatchSaturation: number
  /** 色板预览用的亮度 */
  swatchLightness: number
}

/**
 * 一组低饱和底色，覆盖不同色系，避免整站压在同一个调子上。
 *
 * 底色本身必须暗，否则正文读不清；但那么暗的颜色相互之间几乎看不出区别，
 * 所以色板另外给一个亮一点的 swatch 值，让人能一眼认出色系。
 */
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "graphite",
    label: "石墨",
    hue: 220,
    saturation: 10,
    darkLightness: 9.4,
    lightLightness: 97,
    swatchSaturation: 0,
    swatchLightness: 28
  },
  {
    id: "ink",
    label: "纯墨",
    hue: 0,
    saturation: 0,
    darkLightness: 6.5,
    lightLightness: 100,
    swatchSaturation: 0,
    swatchLightness: 14
  },
  {
    id: "cyan",
    label: "曜青",
    hue: 191,
    saturation: 20,
    darkLightness: 9.5,
    lightLightness: 99,
    swatchSaturation: 34,
    swatchLightness: 34
  },
  {
    id: "moss",
    label: "松绿",
    hue: 155,
    saturation: 18,
    darkLightness: 9.5,
    lightLightness: 99,
    swatchSaturation: 30,
    swatchLightness: 32
  },
  {
    id: "rose",
    label: "灰玫",
    hue: 345,
    saturation: 16,
    darkLightness: 9.5,
    lightLightness: 99,
    swatchSaturation: 30,
    swatchLightness: 36
  }
]

/**
 * v6：开放完整的 0–100% 参数范围，同时把图片模式默认值提高到清晰区间。
 * 默认只铺对话区，侧栏、顶栏和输入区保持实体表面。
 */
export const APPEARANCE_KEY = "veyra-local-appearance-v6"
const LEGACY_APPEARANCE_KEYS = [
  "veyra-local-appearance-v5",
  "veyra-local-appearance-v4",
  "veyra-local-appearance-v3",
  "veyra-local-appearance-v2"
]

export const DEFAULT_APPEARANCE: Appearance = {
  coverage: "stage",
  preset: "graphite",
  customColor: "#12181d",
  imageUrl: "",
  veil: 0.8,
  panelAlpha: 1,
  cardAlpha: 1,
  stageAlpha: 0.82,
  panelBlur: 0
}

export interface PanelStyle {
  id: string
  label: string
  panelAlpha: number
  cardAlpha: number
  stageAlpha: number
  panelBlur: number
}

/** 面板质感的三个档位；选完还能用滑杆微调 */
export const PANEL_STYLES: PanelStyle[] = [
  {
    id: "solid",
    label: "实心",
    panelAlpha: 1,
    cardAlpha: 1,
    stageAlpha: 0.9,
    panelBlur: 0
  },
  {
    id: "frosted",
    label: "清晰",
    panelAlpha: 1,
    cardAlpha: 1,
    stageAlpha: 0.82,
    panelBlur: 0
  },
  {
    id: "clear",
    label: "通透",
    panelAlpha: 0.78,
    cardAlpha: 0.9,
    stageAlpha: 0.62,
    panelBlur: 0
  }
]

/** 图片模式优先保证正文清晰，保留少量透明感但不做重度模糊 */
export const IMAGE_PANEL_STYLE = PANEL_STYLES[1]

/** 自定义底色允许的范围：饱和度与亮度都收在安全区内，避免正文读不清 */
const SATURATION_CAP = 24
const DARK_LIGHTNESS_RANGE: [number, number] = [3, 14]
const LIGHT_LIGHTNESS_RANGE: [number, number] = [93, 100]
export const VEIL_RANGE: [number, number] = [0, 1]
export const PANEL_ALPHA_RANGE: [number, number] = [0, 1]
export const CARD_ALPHA_RANGE: [number, number] = [0, 1]
export const STAGE_ALPHA_RANGE: [number, number] = [0, 1]
export const PANEL_BLUR_RANGE: [number, number] = [0, 12]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function loadAppearance(): Appearance {
  if (typeof localStorage === "undefined") return DEFAULT_APPEARANCE
  try {
    const current = localStorage.getItem(APPEARANCE_KEY)
    const legacyKey = LEGACY_APPEARANCE_KEYS.find(key =>
      localStorage.getItem(key)
    )
    const raw = current ?? (legacyKey ? localStorage.getItem(legacyKey) : null)
    if (!raw) return DEFAULT_APPEARANCE

    const parsed = JSON.parse(raw) as Partial<Appearance>
    if (!current) {
      // 旧版 → v6：保留图片与底色，参数回到清晰默认值，滑块范围完整开放。
      const migrated: Appearance = {
        ...DEFAULT_APPEARANCE,
        coverage: "stage",
        preset:
          typeof parsed.preset === "string"
            ? parsed.preset
            : DEFAULT_APPEARANCE.preset,
        customColor:
          typeof parsed.customColor === "string"
            ? parsed.customColor
            : DEFAULT_APPEARANCE.customColor,
        imageUrl: typeof parsed.imageUrl === "string" ? parsed.imageUrl : ""
      }
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(migrated))
      return migrated
    }

    return {
      ...DEFAULT_APPEARANCE,
      ...parsed
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function saveAppearance(appearance: Appearance): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance))
  } catch {
    // 存储不可用时忽略：当前会话里的外观依然是对的
  }
}

/** #rrggbb -> HSL，色相 0-360、饱和度与亮度 0-100 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace("#", "").trim()
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map(c => c + c)
          .join("")
      : normalized
  const value = Number.parseInt(full, 16)
  if (full.length !== 6 || Number.isNaN(value)) return { h: 210, s: 10, l: 7 }

  const r = ((value >> 16) & 255) / 255
  const g = ((value >> 8) & 255) / 255
  const b = (value & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }
  if (h < 0) h += 360

  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100 * 10) / 10
  }
}

/** 把外观设置化成底色的 hue / saturation / lightness */
function resolveBase(
  appearance: Appearance,
  mode: "dark" | "light"
): { h: number; s: number; l: number } {
  const range = mode === "dark" ? DARK_LIGHTNESS_RANGE : LIGHT_LIGHTNESS_RANGE

  if (appearance.preset === "custom") {
    const { h, s, l } = hexToHsl(appearance.customColor)
    return {
      h,
      s: clamp(s, 0, SATURATION_CAP),
      l: clamp(l, range[0], range[1])
    }
  }

  const preset =
    BACKGROUND_PRESETS.find(p => p.id === appearance.preset) ??
    BACKGROUND_PRESETS[0]
  return {
    h: preset.hue,
    s: preset.saturation,
    l: mode === "dark" ? preset.darkLightness : preset.lightLightness
  }
}

/** 表面色阶相对底色的偏移量（深色）：照 Codex 的灰阶差逐层变亮 */
const DARK_RAMP: Record<string, number> = {
  "--background": 0,
  "--card": 3.6,
  "--popover": 7,
  "--secondary": 5,
  "--muted": 7.5,
  "--accent": 7.5,
  "--border": 11,
  "--input": 15
}

/** 表面色阶相对底色的偏移量（浅色）：灰白画布承托白色内容面与逐级加深的控件 */
const LIGHT_RAMP: Record<string, number> = {
  "--background": 0,
  "--card": 3,
  "--popover": 3,
  "--secondary": -3,
  "--muted": -4,
  "--accent": -5,
  "--border": -11,
  "--input": -14
}

/** 由底色推出一组表面色阶，卡片 / 浮层 / 填充各自落在不同亮度上 */
export function surfaceRamp(
  appearance: Appearance,
  mode: "dark" | "light"
): Record<string, string> {
  const { h, s, l } = resolveBase(appearance, mode)
  const offsets = mode === "dark" ? DARK_RAMP : LIGHT_RAMP
  const ramp: Record<string, string> = {}
  for (const [key, offset] of Object.entries(offsets)) {
    ramp[key] = `${h} ${s}% ${clamp(l + offset, 0, 100)}%`
  }
  return ramp
}

const RAMP_KEYS = [
  "--background",
  "--card",
  "--popover",
  "--muted",
  "--secondary",
  "--accent",
  "--border",
  "--input"
]

/** 背景图地址只放行 http(s) 与 data:image，避免把 javascript: 之类塞进 CSS */
export function safeImageUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed))
    return trimmed
  if (trimmed.startsWith("/")) return trimmed
  return ""
}

/** 把外观写到 <html> 上；传 null 表示清掉所有覆盖，回到 globals.css 的默认值 */
export function applyAppearance(appearance: Appearance | null): void {
  if (typeof document === "undefined") return
  const root = document.documentElement

  if (!appearance) {
    RAMP_KEYS.forEach(key => root.style.removeProperty(key))
    root.style.removeProperty("--veyra-bg-image")
    root.style.removeProperty("--veyra-bg-veil")
    root.style.removeProperty("--veyra-panel-alpha")
    root.style.removeProperty("--veyra-card-alpha")
    root.style.removeProperty("--veyra-stage-alpha")
    root.style.removeProperty("--veyra-panel-blur")
    root.removeAttribute("data-veyra-bg")
    root.removeAttribute("data-veyra-coverage")
    return
  }

  const mode = root.classList.contains("dark") ? "dark" : "light"
  const ramp = surfaceRamp(appearance, mode)
  Object.entries(ramp).forEach(([key, value]) =>
    root.style.setProperty(key, value)
  )

  const image = safeImageUrl(appearance.imageUrl)

  // 面板参数只在图片模式下有意义：纯色背景里半透明面板看不出区别，反而降对比度
  root.style.setProperty(
    "--veyra-panel-alpha",
    String(clamp(appearance.panelAlpha, ...PANEL_ALPHA_RANGE))
  )
  root.style.setProperty(
    "--veyra-card-alpha",
    String(clamp(appearance.cardAlpha, ...CARD_ALPHA_RANGE))
  )
  root.style.setProperty(
    "--veyra-stage-alpha",
    String(clamp(appearance.stageAlpha, ...STAGE_ALPHA_RANGE))
  )
  root.style.setProperty(
    "--veyra-panel-blur",
    `${clamp(appearance.panelBlur, ...PANEL_BLUR_RANGE)}px`
  )

  if (image) {
    // CSS url() 里的引号和反斜杠要转义，否则地址能提前闭合 url(...)
    const escaped = image.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
    root.style.setProperty("--veyra-bg-image", `url("${escaped}")`)
    root.style.setProperty(
      "--veyra-bg-veil",
      String(clamp(appearance.veil, ...VEIL_RANGE))
    )
    root.setAttribute("data-veyra-bg", "image")
    root.setAttribute("data-veyra-coverage", appearance.coverage)
  } else {
    root.style.removeProperty("--veyra-bg-image")
    root.style.removeProperty("--veyra-bg-veil")
    root.removeAttribute("data-veyra-bg")
    root.removeAttribute("data-veyra-coverage")
  }
}

/** 预览用的色板颜色：用专门的 swatch 值，而不是几乎全黑的底色 */
export function swatchColor(
  preset: BackgroundPreset,
  mode: "dark" | "light" = "dark"
): string {
  // 浅色模式下把预览再提亮一档，跟白底页面拉开关系
  const l =
    mode === "light"
      ? Math.min(preset.swatchLightness + 48, 92)
      : preset.swatchLightness
  return `hsl(${preset.hue} ${preset.swatchSaturation}% ${l}%)`
}

/** 自定义色的色板预览：同样提亮，避免看上去一团黑 */
export function customSwatchColor(
  hex: string,
  mode: "dark" | "light" = "dark"
): string {
  const { h, s } = hexToHsl(hex)
  const saturation = clamp(Math.max(s, 20), 0, 45)
  return `hsl(${h} ${saturation}% ${mode === "light" ? 74 : 34}%)`
}
