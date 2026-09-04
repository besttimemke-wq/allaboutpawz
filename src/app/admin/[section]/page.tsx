"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import { ALL_RESOURCES } from "@/lib/cms-config"
import { SUBMISSION_CONFIGS, SubmissionsSection } from "@/components/cms/submissions-section"
import { RecordsSection } from "@/components/cms/records-section"
import { SettingsSection } from "@/components/cms/settings-section"

export default function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params)
  const resourceCfg = ALL_RESOURCES.find((r) => r.resource === section)
  if (resourceCfg) return <RecordsSection config={resourceCfg} />
  const submissionCfg = SUBMISSION_CONFIGS.find((s) => s.resource === section)
  if (submissionCfg) return <SubmissionsSection config={submissionCfg} />
  if (section === "settings") return <SettingsSection />
  notFound()
}
