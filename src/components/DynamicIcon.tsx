import React from 'react';
import {
  PawPrint,
  Heart,
  Briefcase,
  Megaphone,
  TrendingUp,
  Users,
  Scissors,
  Shield,
  Sparkles,
  MessageSquare,
  Home,
  GraduationCap,
  Compass,
  Calendar,
  Building2,
  Laptop,
  CheckCircle2,
  Wifi,
  HelpCircle,
} from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
}

export function DynamicIcon({ name, className = 'w-5 h-5' }: DynamicIconProps) {
  switch (name.toLowerCase()) {
    case 'pawprint':
      return <PawPrint className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'megaphone':
      return <Megaphone className={className} />;
    case 'trendingup':
      return <TrendingUp className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'scissors':
      return <Scissors className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'messagesquare':
      return <MessageSquare className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'graduationcap':
      return <GraduationCap className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'building2':
      return <Building2 className={className} />;
    case 'laptop':
      return <Laptop className={className} />;
    case 'checkcircle2':
      return <CheckCircle2 className={className} />;
    case 'wifi':
      return <Wifi className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
}
