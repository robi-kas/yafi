"use client"

import { useEffect } from "react"

export function ExtensionErrorHandler() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const filename = event.filename || ""
      if (filename.startsWith("chrome-extension://") || filename.startsWith("moz-extension://") || filename.startsWith("safari-extension://")) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const stack = event.reason?.stack || ""
      const message = event.reason?.message || ""
      if (stack.includes("chrome-extension://") || stack.includes("moz-extension://") || stack.includes("safari-extension://") ||
          message.includes("extension") || message.includes("MetaMask") || message.includes("ethereum")) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener("error", handler, true)
    window.addEventListener("unhandledrejection", rejectionHandler, true)

    return () => {
      window.removeEventListener("error", handler, true)
      window.removeEventListener("unhandledrejection", rejectionHandler, true)
    }
  }, [])

  return null
}
