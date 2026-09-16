"use client"

import { AppearanceProvider } from "@/components/local/appearance-provider"
import {
  IconChartBar,
  IconDatabase,
  IconMessage,
  IconMoon,
  IconSettings,
  IconSun,
  IconUsers
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { ReactNode, useEffect, useState } from "react"

const NAV = [
  { href: "/local", label: "会话", icon: IconMessage },
  { href: "/local/assistants", label: "助手", icon: IconUsers },
  { href: "/local/kb", label: "知识库", icon: IconDatabase },
  { href: "/local/usage", label: "用量", icon: IconChartBar },
  { href: "/local/settings", label: "设置", icon: IconSettings }
]

/** 本地模式的应用外壳：左侧一条窄导航，右侧是各页面自己的内容 */
export default function LocalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  // 服务端不知道当前主题，首帧必须与客户端保持一致：挂载前只渲染占位。
  // 否则图标会在水合时从「太阳」变成「月亮」，React 会报 hydration mismatch。
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="text-foreground relative flex h-dvh w-full overflow-hidden">
      <AppearanceProvider />
      <nav className="veyra-panel bg-card border-border/70 flex w-[68px] shrink-0 flex-col items-center gap-1.5 border-r py-3">
        <div className="bg-primary text-primary-foreground mb-2 flex size-8 items-center justify-center rounded-md text-[13px] font-semibold shadow-[0_2px_6px_rgba(15,23,42,0.16)]">
          V
        </div>

        {NAV.map(item => {
          const active =
            item.href === "/local"
              ? pathname === "/local"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-14 flex-col items-center gap-1 rounded-md py-2 text-[11px] transition-colors",
                active
                  ? "bg-brand/10 text-brand ring-brand/10 font-medium ring-1 ring-inset"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon size={18} stroke={1.75} />
              {item.label}
            </Link>
          )
        })}

        <button
          type="button"
          className="text-muted-foreground hover:bg-muted/50 hover:text-foreground mt-auto flex w-14 flex-col items-center gap-1 rounded-md py-2 text-[11px] transition-colors disabled:opacity-40"
          title={
            mounted
              ? resolvedTheme === "dark"
                ? "切到亮色"
                : "切到暗色"
              : "主题"
          }
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          disabled={!mounted}
        >
          {!mounted ? (
            <span className="size-[18px]" />
          ) : resolvedTheme === "dark" ? (
            <IconSun size={18} stroke={1.75} />
          ) : (
            <IconMoon size={18} stroke={1.75} />
          )}
          主题
        </button>
      </nav>

      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  )
}
