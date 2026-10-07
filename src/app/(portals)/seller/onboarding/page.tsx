"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronRight, User, Building, CreditCard, IdCard, Tag, FileText } from "lucide-react"

// ---------------------------------------------------------------------------
// /seller/onboarding — 6-step onboarding + application status. Per spec §2.1:
// Entry: /signup?next=/seller/onboarding
// Steps persist server-side per seller_account.
// ---------------------------------------------------------------------------

const STEPS = [
  { n: 1, icon: User, title: "Account", desc: "Create or reuse your platform account" },
  { n: 2, icon: Building, title: "Business Profile", desc: "Legal business name, address, phone" },
  { n: 3, icon: CreditCard, title: "Tax + Payouts", desc: "Tax ID + bank account for disbursements" },
  { n: 4, icon: IdCard, title: "Identity Verification", desc: "Government ID + proof of address" },
  { n: 5, icon: Tag, title: "Catalog Readiness", desc: "Categories + fulfillment attestation" },
  { n: 6, icon: FileText, title: "Seller Agreement", desc: "Accept marketplace policies" },
]

export default function SellerOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [status, setStatus] = useState("draft")

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900">Seller Onboarding</h1>
        <p className="mt-1 text-sm text-gray-500">Complete all steps to submit your seller application.</p>

        {/* Status badge */}
        <div className="mt-4">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            Status: {status.toUpperCase()}
          </span>
        </div>

        {/* Step progress */}
        <div className="mt-8 mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step.n} className="flex items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${currentStep >= step.n ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-400"}`}>
                  {currentStep > step.n ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-12 lg:w-20 ${currentStep > step.n ? "bg-blue-600" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            {STEPS.map((step) => (
              <div key={step.n} className="flex w-16 flex-col items-center lg:w-24">
                <span className={`text-xs font-semibold ${currentStep >= step.n ? "text-blue-600" : "text-gray-400"}`}>{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current step content */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {currentStep === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Account Creation</h2>
              <p className="mt-2 text-sm text-gray-600">Your account is already created. If you have an existing customer account, it's been reused — one account per the architecture.</p>
              <button onClick={() => setCurrentStep(2)} className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Continue →</button>
            </div>
          )}
          {currentStep === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Business Profile</h2>
              <div className="mt-4 space-y-3">
                <input placeholder="Legal Business Name" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="DBA (optional)" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Business Address" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Business Phone" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm"><option>Business Type</option><option>LLC</option><option>Corporation</option><option>Sole Proprietor</option></select>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setCurrentStep(1)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600">Back</button>
                <button onClick={() => setCurrentStep(3)} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Continue →</button>
              </div>
            </div>
          )}
          {currentStep === 3 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Tax + Payouts</h2>
              <p className="mt-2 text-sm text-gray-600">Tax interview (W-9-style) and bank account for disbursements.</p>
              <div className="mt-4 space-y-3">
                <input placeholder="Tax ID (EIN or SSN)" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Bank Account Number" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                <input placeholder="Routing Number" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setCurrentStep(2)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600">Back</button>
                <button onClick={() => setCurrentStep(4)} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Continue →</button>
              </div>
            </div>
          )}
          {currentStep === 4 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Identity Verification (KYC)</h2>
              <p className="mt-2 text-sm text-gray-600">Upload government-issued photo ID + proof of address.</p>
              <div className="mt-4 space-y-3">
                <div className="rounded border-2 border-dashed border-gray-300 p-6 text-center"><p className="text-sm text-gray-500">Upload Photo ID</p></div>
                <div className="rounded border-2 border-dashed border-gray-300 p-6 text-center"><p className="text-sm text-gray-500">Upload Proof of Address</p></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setCurrentStep(3)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600">Back</button>
                <button onClick={() => setCurrentStep(5)} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Continue →</button>
              </div>
            </div>
          )}
          {currentStep === 5 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Catalog Readiness</h2>
              <p className="mt-2 text-sm text-gray-600">Select which categories you will sell in (dogs and cats only).</p>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2"><input type="checkbox" /> Dog Supplies</label>
                <label className="flex items-center gap-2"><input type="checkbox" /> Cat Supplies</label>
              </div>
              <div className="mt-4 space-y-3">
                <label className="text-sm text-gray-600">Fulfillment SLA: ship within X business days</label>
                <input type="number" placeholder="2" className="w-20 rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setCurrentStep(4)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600">Back</button>
                <button onClick={() => setCurrentStep(6)} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Continue →</button>
              </div>
            </div>
          )}
          {currentStep === 6 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900">Seller Agreement</h2>
              <div className="mt-4 max-h-48 overflow-y-auto rounded border border-gray-200 p-4 text-xs text-gray-600">
                <p>Seller Agreement v1.0 — All About Pawz Marketplace...</p>
                <p className="mt-2">By submitting, you agree to the marketplace policies, fulfillment SLA, returns policy, and fee model.</p>
              </div>
              <label className="mt-4 flex items-center gap-2">
                <input type="checkbox" /> I accept the Seller Agreement
              </label>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setCurrentStep(5)} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600">Back</button>
                <button onClick={() => { setStatus("submitted"); }} className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Submit Application</button>
              </div>
              {status === "submitted" && (
                <p className="mt-4 text-sm text-green-600">Application submitted! You'll receive a response within 24-72 hours.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
