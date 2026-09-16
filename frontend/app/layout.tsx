import { Providers } from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })
const APP_NAME = "智能对话"
const APP_DEFAULT_TITLE = "智能对话"
const APP_TITLE_TEMPLATE = "%s - 智能对话"
const APP_DESCRIPTION = "支持多种 AI 模型的本地对话工作台"

interface RootLayoutProps {
  children: ReactNode
}

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: APP_DEFAULT_TITLE
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE
    },
    description: APP_DESCRIPTION
  }
}

export const viewport: Viewport = {
  themeColor: "#ffffff"
}

const i18nNamespaces = ["translation"]

/**
 * 根布局。
 *
 * 这里只负责主题与全局提示——认证、数据加载都已经去掉了：
 * 桌面端那套 Supabase 依赖已整体移除，页面自己负责取数（本地模式走 /api/veyra/*）。
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Toaster richColors position="top-center" duration={3000} />
          <div className="bg-background text-foreground flex h-dvh flex-col overflow-x-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
