import {
  Scissors, Bath, PawPrint, Droplets, Sparkles, Bug, ShoppingBag,
  ImageIcon, Tag, HelpCircle, ShieldCheck, Quote, Star, Leaf, Award,
  Dog, Heart, CalendarDays, Mail, Phone, MapPin, Clock, Facebook, Instagram,
  CheckCircle2, Play, Check, Menu, ChevronRight, Minus, Plus, Search,
  Trash2, Pencil, Eye, EyeOff, MoreVertical, Settings, Inbox, PhoneCall,
  CalendarCheck, TrendingUp, ArrowUpRight, LayoutDashboard, Save, Store, Share2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// Custom brand icons — drawn in the Lucide style (24×24, stroke-based) so
// they drop into any lucide slot (same className/strokeWidth props).
// ---------------------------------------------------------------------------

/** Professional toothbrush — angled handle + bristle head. */
function ToothbrushBase({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* handle */}
      <path d="M3.5 20.5 12 12" />
      {/* neck + head */}
      <path d="M12 12l3.2-3.2 4.3 4.3-3.2 3.2c-1 1-2.6 1-3.6 0L12 12Z" />
      {/* bristles */}
      <path d="M15.6 8.9 14.4 7.7" />
      <path d="M17 7.5 15.8 6.3" />
      <path d="M18.4 6.1 17.2 4.9" />
      <path d="M19.8 4.7 18.6 3.5" />
    </svg>
  )
}

/** Grooming comb — spine with fine teeth. */
function CombBase({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* handle */}
      <path d="M2.8 4.5c1.5-1.5 3.6-1.4 4.9 0l1.6 1.7" />
      {/* spine */}
      <path d="M8.6 5.9 21 18.3c.5.5.5 1.4 0 1.9-.5.5-1.4.5-1.9 0L6.7 7.8" />
      {/* teeth */}
      <path d="M11.2 8.5l1.6 1.6" />
      <path d="M13.4 10.7l1.6 1.6" />
      <path d="M15.6 12.9l1.6 1.6" />
      <path d="M17.8 15.1l1.6 1.6" />
      <path d="M9.9 7.2l1.6 1.6" />
      <path d="M12.1 9.4l1.6 1.6" />
      <path d="M14.3 11.6l1.6 1.6" />
      <path d="M16.5 13.8l1.6 1.6" />
    </svg>
  )
}

const Toothbrush = ToothbrushBase as unknown as LucideIcon
const Comb = CombBase as unknown as LucideIcon

// Map of icon names (stored in the DB) to Lucide components.
export const ICONS: Record<string, LucideIcon> = {
  Scissors, Bath, PawPrint, Droplets, Sparkles, Bug, ShoppingBag, ImageIcon,
  Tag, HelpCircle, ShieldCheck, Quote, Star, Leaf, Award, Dog, Heart,
  CalendarDays, Mail, Phone, MapPin, Clock, Facebook, Instagram,
  CheckCircle2, Play, Check, Menu, ChevronRight, Minus, Plus, Search,
  Trash2, Pencil, Eye, EyeOff, MoreVertical, Settings, Inbox, PhoneCall,
  CalendarCheck, TrendingUp, ArrowUpRight, LayoutDashboard, Save, Store, Share2,
  Toothbrush, Comb,
}

export function getIcon(name: string | null | undefined, fallback: LucideIcon = Sparkles): LucideIcon {
  if (name && ICONS[name]) return ICONS[name]
  return fallback
}
