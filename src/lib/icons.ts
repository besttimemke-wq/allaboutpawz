import {
  Scissors, Bath, PawPrint, Droplets, Sparkles, Bug, ShoppingBag,
  ImageIcon, Tag, HelpCircle, ShieldCheck, Quote, Star, Leaf, Award,
  Dog, Heart, CalendarDays, Mail, Phone, MapPin, Clock, Facebook, Instagram,
  CheckCircle2, Play, Check, Menu, ChevronRight, Minus, Plus, Search,
  Trash2, Pencil, Eye, EyeOff, MoreVertical, Settings, Inbox, PhoneCall,
  CalendarCheck, TrendingUp, ArrowUpRight, LayoutDashboard, Save, Store, Share2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// Map of icon names (stored in the DB) to Lucide components.
export const ICONS: Record<string, LucideIcon> = {
  Scissors, Bath, PawPrint, Droplets, Sparkles, Bug, ShoppingBag, ImageIcon,
  Tag, HelpCircle, ShieldCheck, Quote, Star, Leaf, Award, Dog, Heart,
  CalendarDays, Mail, Phone, MapPin, Clock, Facebook, Instagram,
  CheckCircle2, Play, Check, Menu, ChevronRight, Minus, Plus, Search,
  Trash2, Pencil, Eye, EyeOff, MoreVertical, Settings, Inbox, PhoneCall,
  CalendarCheck, TrendingUp, ArrowUpRight, LayoutDashboard, Save, Store, Share2,
}

export function getIcon(name: string | null | undefined, fallback: LucideIcon = Sparkles): LucideIcon {
  if (name && ICONS[name]) return ICONS[name]
  return fallback
}
