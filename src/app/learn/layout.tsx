import { LearnChrome } from "@/components/learn/learn-chrome"

// Learning Center layout — wraps public learn pages in the site chrome
// (owner ruling: the Learning Center must be wrapped like the rest of the
// site; the LMS app surfaces opt out inside LearnChrome).
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <LearnChrome>{children}</LearnChrome>
}
