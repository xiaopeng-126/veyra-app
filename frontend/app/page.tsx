"use client"

import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme } = useTheme()

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-normal">
        智能对话
      </div>

      <Link
        className="veyra-btn-primary mt-6 flex w-[200px] items-center justify-center gap-1 px-4 py-2"
        href="/local"
      >
        进入本地模式
        <IconArrowRight size={18} stroke={1.75} />
      </Link>

      <p className="text-muted-foreground/75 mt-4 max-w-md px-6 text-center text-sm leading-relaxed">
        不需要登录，会话存在这台浏览器里；检索、工具调用与多智能体由本机的
        Python 后端执行。
      </p>
    </div>
  )
}
