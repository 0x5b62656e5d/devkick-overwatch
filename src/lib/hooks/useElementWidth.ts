import { useEffect, useRef, useState } from 'react'

// SSR-safe width measurement. Renders at `fallback` on the server and
// first paint, then tracks the element with a ResizeObserver.
export function useElementWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth || fallback)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fallback])

  return { ref, width }
}
