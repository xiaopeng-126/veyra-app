"use client"

import { ThemeProvider } from "next-themes"
import { ReactNode } from "react"

/**
 * 全局 Provider 包装。
 *
 * 必须是客户端组件：next-themes 内部用 createContext，
 * 直接写在服务端 layout 里会在渲染时抛 "createContext is not a function"。
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      storageKey="veyra-theme"
    >
      {children}
    </ThemeProvider>
  )
}
