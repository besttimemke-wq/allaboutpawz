// The admin page IS the full shell (sidebar + header + content).
// No wrapper needed — the page renders its own layout.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
