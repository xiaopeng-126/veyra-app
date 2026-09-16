import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { IconCheck, IconCopy, IconDownload } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import { FC, memo } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  oneDark,
  oneLight
} from "react-syntax-highlighter/dist/cjs/styles/prism"

interface MessageCodeBlockProps {
  language: string
  value: string
}

interface languageMap {
  [key: string]: string | undefined
}

export const programmingLanguages: languageMap = {
  javascript: ".js",
  python: ".py",
  java: ".java",
  c: ".c",
  cpp: ".cpp",
  "c++": ".cpp",
  "c#": ".cs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  "objective-c": ".m",
  kotlin: ".kt",
  typescript: ".ts",
  go: ".go",
  perl: ".pl",
  rust: ".rs",
  scala: ".scala",
  haskell: ".hs",
  lua: ".lua",
  shell: ".sh",
  sql: ".sql",
  html: ".html",
  css: ".css"
}

export const generateRandomString = (length: number, lowercase = false) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXY3456789" // excluding similar looking characters like Z, 2, I, 1, O, 0
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return lowercase ? result.toLowerCase() : result
}

export const MessageCodeBlock: FC<MessageCodeBlockProps> = memo(
  ({ language, value }) => {
    const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })
    const { resolvedTheme } = useTheme()
    // 消息是挂载后才从 localStorage 读出来渲染的，这里不存在服务端不一致
    const isDark = resolvedTheme !== "light"

    const downloadAsFile = () => {
      if (typeof window === "undefined") {
        return
      }
      const fileExtension = programmingLanguages[language] || ".file"
      const suggestedFileName = `file-${generateRandomString(
        3,
        true
      )}${fileExtension}`
      const fileName = window.prompt("请输入文件名", suggestedFileName)

      if (!fileName) {
        return
      }

      const blob = new Blob([value], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = fileName
      link.href = url
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    const onCopy = () => {
      if (isCopied) return
      copyToClipboard(value)
    }

    return (
      <div className="codeblock relative w-full overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-50 font-sans shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex w-full items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-4 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <span className="text-xs lowercase">{language}</span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-zinc-200 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:ring-offset-0 dark:hover:bg-zinc-800 dark:focus-visible:ring-slate-700"
              onClick={downloadAsFile}
            >
              <IconDownload size={16} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-xs hover:bg-zinc-200 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:ring-offset-0 dark:hover:bg-zinc-800 dark:focus-visible:ring-slate-700"
              onClick={onCopy}
            >
              {isCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </Button>
          </div>
        </div>
        <SyntaxHighlighter
          language={language}
          style={isDark ? oneDark : oneLight}
          // showLineNumbers
          customStyle={{
            margin: 0,
            width: "100%",
            background: "transparent"
          }}
          codeTagProps={{
            style: {
              fontSize: "14px",
              fontFamily: "var(--font-mono)"
            }
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    )
  }
)

MessageCodeBlock.displayName = "MessageCodeBlock"
