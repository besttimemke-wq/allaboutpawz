'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PawPrint, Camera, Spinner, Check } from '@phosphor-icons/react'

/**
 * PetCard — reusable dog profile card.
 *
 * Variants:
 *   - 'customer' (default): luxury gold salon aesthetic, used on /account
 *   - 'admin': neutral admin aesthetic, used on /admin/customers/[id]
 *
 * Behaviour:
 *   - Optional photo upload via a small camera button overlay on the photo circle.
 *     POSTs multipart/form-data to `/api/dogs/${dog.id}/photo` with field name `file`.
 *     Expects `{ url: string }` JSON response. Calls `onPhotoChange?.(url)` on success.
 *   - Optional `linkTo` wraps the *body* (excluding the upload button) in a Next.js <Link>.
 */

export interface PetCardProps {
  dog: {
    id: string
    name: string
    breedName?: string | null
    sex?: string | null
    birthDate?: string | null
    weightLbs?: string | number | null
    color?: string | null
    markings?: string | null
    photoUrl?: string | null
  }
  variant?: 'customer' | 'admin' // 'customer' = luxury gold theme, 'admin' = neutral
  onPhotoChange?: (newPhotoUrl: string | null) => void // called after successful upload
  allowUpload?: boolean // default true
  linkTo?: string // optional href — wraps the card body in a <Link>
}

/** Calculate age string e.g. "3 yrs · 2 mos" from a birthDate. Returns null if invalid. */
function calcAge(birthDate?: string | null): string | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0 || (years === 0 && months < 0)) return null
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr${years === 1 ? '' : 's'}`)
  if (months > 0) parts.push(`${months} mo${months === 1 ? '' : 's'}`)
  if (parts.length === 0) return '0 mos'
  return parts.join(' · ')
}

export function PetCard({
  dog,
  variant = 'customer',
  onPhotoChange,
  allowUpload = true,
  linkTo,
}: PetCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Local photo state — keeps the displayed photo in sync with the prop,
  // but we update it locally on successful upload (don't wait for parent re-fetch).
  const [photoUrl, setPhotoUrl] = useState<string | null>(dog.photoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Sync local state if the parent updates dog.photoUrl (e.g. after a re-fetch).
  useEffect(() => {
    setPhotoUrl(dog.photoUrl ?? null)
  }, [dog.photoUrl])

  // Cleanup any pending "saved" timeout on unmount.
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  const triggerFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/dogs/${dog.id}/photo`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        let detail = `Upload failed (${res.status})`
        try {
          const text = await res.text()
          if (text) {
            // Try to parse JSON error like { "error": "...", "migration": "..." }
            try {
              const j = JSON.parse(text)
              if (j && typeof j.error === 'string') detail = j.error
              else detail = text.length > 200 ? text.slice(0, 200) + '…' : text
            } catch {
              detail = text.length > 200 ? text.slice(0, 200) + '…' : text
            }
          }
        } catch {
          /* ignore body read errors */
        }
        throw new Error(detail)
      }
      const data: unknown = await res.json()
      if (typeof data !== 'object' || data === null || typeof (data as { url?: unknown }).url !== 'string') {
        throw new Error('Invalid response from server')
      }
      const url = (data as { url: string }).url
      setPhotoUrl(url)
      onPhotoChange?.(url)
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      setJustSaved(true)
      savedTimeoutRef.current = setTimeout(() => setJustSaved(false), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re-selected.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const isCustomer = variant === 'customer'

  // --- Photo element (the visible circle content) ---
  const photoElement = photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={`${dog.name} photo`}
      className="h-full w-full rounded-full object-cover"
    />
  ) : isCustomer ? (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-cream-deep">
      <PawPrint size={24} weight="fill" className="text-gold-deep" />
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-zinc-100">
      <PawPrint size={20} weight="fill" className="text-zinc-700" />
    </div>
  )

  // When linkTo is provided, the photo is wrapped in a Link — but the camera button
  // is rendered as a sibling (outside the Link) so clicking it never navigates.
  const photoInsideLink = linkTo ? (
    <Link
      href={linkTo}
      className="block h-full w-full rounded-full"
      aria-label={`${dog.name} — view details`}
    >
      {photoElement}
    </Link>
  ) : (
    photoElement
  )

  // --- Camera button overlay (outside the Link) ---
  const cameraBtn = allowUpload ? (
    <button
      type="button"
      onClick={triggerFilePicker}
      aria-label="Upload pet photo"
      title="Upload pet photo"
      className={
        isCustomer
          ? 'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold-deep text-white shadow ring-2 ring-cream hover:bg-gold'
          : 'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-white shadow ring-2 ring-white hover:bg-zinc-700'
      }
    >
      <Camera size={isCustomer ? 11 : 9} weight="bold" />
    </button>
  ) : null

  // --- Spinner / saved overlays (outside the Link) ---
  const spinnerOverlay = uploading ? (
    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/55">
      <Spinner size={isCustomer ? 16 : 12} className="animate-spin text-white" />
    </div>
  ) : null

  const savedOverlay = justSaved && !uploading ? (
    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-600/75">
      <Check size={isCustomer ? 16 : 12} weight="bold" className="text-white" />
    </div>
  ) : null

  const photoSizeClass = isCustomer ? 'h-16 w-16' : 'h-10 w-10'

  // Photo wrapper holds the photo (possibly Link-wrapped) + absolutely-positioned overlays.
  // No overflow-hidden so the camera button can sit slightly outside the circle.
  const photoWrapper = (
    <div className={`relative ${photoSizeClass} shrink-0`}>
      {photoInsideLink}
      {cameraBtn}
      {spinnerOverlay}
      {savedOverlay}
    </div>
  )

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      className="hidden"
      tabIndex={-1}
      aria-hidden="true"
    />
  )

  // --- Build sub-text parts (breed · age · weight for customer; breed · age · sex · weight for admin) ---
  const ageStr = calcAge(dog.birthDate)
  const weightLabel = dog.weightLbs ? `${dog.weightLbs} lbs` : null

  const errorBlock = error ? (
    <p className="mt-1 text-[10px] leading-tight text-red-600">{error}</p>
  ) : null

  if (isCustomer) {
    // ---------- CUSTOMER VARIANT ----------
    const subParts: string[] = []
    if (dog.breedName) subParts.push(dog.breedName)
    if (ageStr) subParts.push(ageStr)
    if (weightLabel) subParts.push(weightLabel)

    const footerRows: { label: string; value: string }[] = []
    if (dog.sex) footerRows.push({ label: 'Sex', value: dog.sex })
    if (weightLabel) footerRows.push({ label: 'Weight', value: weightLabel })
    if (dog.color) footerRows.push({ label: 'Color', value: dog.color })
    if (dog.markings) footerRows.push({ label: 'Markings', value: dog.markings })

    const textBlock = (
      <>
        <p className="text-[14px] font-semibold text-ink">{dog.name}</p>
        <p className="text-[11px] text-ink-soft">{subParts.join(' · ') || '—'}</p>
      </>
    )

    const textCol = linkTo ? (
      <Link href={linkTo} className="min-w-0 flex-1 block">
        {textBlock}
      </Link>
    ) : (
      <div className="min-w-0 flex-1">{textBlock}</div>
    )

    return (
      <div className="rounded-lg border border-gold/25 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            {photoWrapper}
            {errorBlock}
          </div>
          {textCol}
        </div>
        {fileInput}
        {footerRows.length > 0 && (
          <div className="mt-3 space-y-0.5 border-t border-gold/20 pt-2">
            {footerRows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-1 text-[11px]">
                <span className="text-zinc-400">{row.label}:</span>
                <span className="text-ink-soft">{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ---------- ADMIN VARIANT ----------
  const subParts: string[] = []
  if (dog.breedName) subParts.push(dog.breedName)
  if (ageStr) subParts.push(ageStr)
  if (dog.sex) subParts.push(dog.sex)
  if (weightLabel) subParts.push(weightLabel)

  const textBlock = (
    <>
      <p className="text-[14px] font-semibold text-zinc-900">{dog.name}</p>
      <p className="text-[11px] text-zinc-400">{subParts.join(' · ') || '—'}</p>
    </>
  )

  const textCol = linkTo ? (
    <Link href={linkTo} className="min-w-0 flex-1 block">
      {textBlock}
    </Link>
  ) : (
    <div className="min-w-0 flex-1">{textBlock}</div>
  )

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 hover:border-zinc-300 hover:bg-zinc-50">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          {photoWrapper}
          {errorBlock}
        </div>
        {textCol}
      </div>
      {fileInput}
    </div>
  )
}

export default PetCard
