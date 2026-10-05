"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react"

interface ImageViewerProps {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  const resetView = useCallback(() => {
    setScale(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [])

  const zoomIn = useCallback(() => {
    setScale(s => Math.min(s * 1.5, 10))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(s => {
      const next = s / 1.5
      if (next < 0.25) {
        resetView()
        return 1
      }
      return next
    })
  }, [resetView])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setScale(s => Math.min(s * 1.1, 10))
    } else {
      setScale(s => {
        const next = s / 1.1
        if (next < 0.25) {
          resetView()
          return 1
        }
        return next
      })
    }
  }, [resetView])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    if (e.key === "=" || e.key === "+") zoomIn()
    if (e.key === "-") zoomOut()
    if (e.key === "r") setRotation(r => r + 90)
    if (e.key === "0") resetView()
  }, [onClose, zoomIn, zoomOut, resetView])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onMouseDown={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel as any}
      style={{ cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "pointer" }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={zoomIn}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Zoom in (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Zoom out (-)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => setRotation(r => r + 90)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Rotate (R)"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          title="Reset view (0)"
        >
          1:1
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs">
        {Math.round(scale * 100)}% &middot; Scroll to zoom &middot; Drag to pan
      </div>

      <img
        ref={imgRef}
        src={src}
        alt={alt || "Image"}
        onMouseDown={handleMouseDown}
        draggable={false}
        className="max-w-[95vw] max-h-[95vh] select-none transition-transform duration-100"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "pointer",
        }}
      />
    </div>
  )
}
