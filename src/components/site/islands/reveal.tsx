"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

// Reusable scroll-reveal wrapper. Server components can pass server-rendered
// JSX as children across the client boundary, so any section can fade/slide
// in as it enters the viewport. `once: true` — it reveals a single time.
export function Reveal({
  children,
  delay = 0,
  y = 36,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
