"use client"

import { applyAppearance, loadAppearance } from "@/lib/local-chat/appearance"
import { useEffect } from "react"

/**
 * 把存在浏览器里的外观设置写到 <html> 上。
 *
 * next-themes 切换深浅色时改的是 <html> 的 class，而色阶要按当前模式重算，
 * 所以这里顺带监听 class 变化，切主题后背景不会错位。
 */
export function AppearanceProvider() {
  useEffect(() => {
    const apply = () => applyAppearance(loadAppearance())
    apply()

    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    })

    // 别的标签页改了外观，这一页跟着更新
    const onStorage = () => apply()
    window.addEventListener("storage", onStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  return null
}
