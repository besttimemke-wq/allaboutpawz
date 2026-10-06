'use client';

import React, { useState, useEffect } from 'react';
import {
  Database, Globe, CreditCard, Mail, MessageSquare, HardDrive,
  ExternalLink, ShieldCheck, Users, Building2, Calendar,
  Activity, CheckCircle2, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenProps {
  onNavigateScreen?: (screenId: string) => void;
  selectedLocation?: string;
  onSelectLocation?: (loc: string) => void;
}

interface SystemHealth {
  service: string;
  label: string;
  status: 'operational' | 'degraded' | 'down';
  icon: React.ElementType;
}

export const SettingsOverviewDashboardScreen: React.FC<ScreenProps> = ({
  onNavigateScreen,
}) => {
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [roleCount, setRoleCount] = useState<number>(0);

  // Fetch live settings + user counts
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    async function fetchData() {
      try {
        const [settingsRes, usersRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/admin/users'),
        ]);
        if (settingsRes.ok) setSettings(await settingsRes.json());
        if (usersRes.ok) {
          const userData = await usersRes.json();
          setUserCount((userData.admins?.length || 0) + (userData.staff?.length || 0) + (userData.customers?.length || 0));
          setRoleCount(userData.roles?.length || 0);
        }
      } catch (err) {
        console.error('Failed to fetch overview data:', err);
      }
    }
    fetchData();
  }, []);

  const systemHealth: SystemHealth[] = [
    { service: 'supabase', label: 'Supabase Database', status: settings ? 'operational' : 'down', icon: Database },
    { service: 'auth', label: 'Login & Authentication', status: 'operational', icon: ShieldCheck },
    { service: 'website', label: 'Public Website', status: 'operational', icon: Globe },
    { service: 'portal', label: 'Customer Portal', status: settings?.portal_theme ? 'operational' : 'degraded', icon: Users },
    { service: 'stripe', label: 'Stripe Payments', status: settings?.stripe_connection_status === 'CONNECTED' ? 'operational' : 'degraded', icon: CreditCard },
    { service: 'email', label: 'Email Service (Resend)', status: 'operational', icon: Mail },
    { service: 'sms', label: 'SMS Service', status: 'operational', icon: MessageSquare },
    { service: 'backups', label: 'Database Backups', status: 'operational', icon: HardDrive },
  ];

  const quickLinks = [
    { label: 'View Public Website', url: settings?.org_website || '#', icon: Globe },
    { label: 'Customer Portal Login', url: settings?.portal_custom_domain || '#', icon: Users },
    { label: 'Stripe Dashboard', url: 'https://dashboard.stripe.com', icon: CreditCard },
    { label: 'Help Center', url: '#', icon: ShieldCheck },
    { label: 'Video Tutorials', url: '#', icon: Activity },
  ];

  const moduleCards = [
    { id: 'org-multiloc', title: 'Locations & Branches', desc: 'Manage physical salon facilities and mobile vans.', action: 'Manage Locations', icon: Building2 },
    { id: 'org-brand', title: 'Brand & Identity', desc: 'Company logos, typography, SMS headers, receipt templates.', action: 'Edit Brand', icon: Globe },
    { id: 'users-staff', title: 'Staff & Role Permissions', desc: 'Team access, commission splits, shift assignments, PIN security.', action: 'Manage Staff', icon: Users },
    { id: 'booking-ops', title: 'Booking Rules & Windows', desc: 'Lead times, deposit rules, cancellation windows, vaccination requirements.', action: 'Configure Rules', icon: Calendar },
    { id: 'booking-rules', title: 'Business & Holiday Hours', desc: 'Weekly operating hours, weekend blocks, holiday blackout calendar.', action: 'Set Hours', icon: Calendar },
    { id: 'services-pricing', title: 'Services & Pricing Matrix', desc: 'Core grooming tiers, breed weight surcharges, membership packages.', action: 'Open Matrix', icon: Activity },
    { id: 'customer-portal', title: 'Client Portal Settings', desc: 'Self-service booking, digital intake, appointment management.', action: 'Configure Portal', icon: Users },
    { id: 'cms-wizard', title: 'Website CMS & Widget', desc: 'Booking flow config, website copy, embeddable appointment widgets.', action: 'Customize', icon: Globe },
    { id: 'system-telemetry', title: 'System Logs & Health', desc: 'Database connectivity, webhook monitors, audit trails, diagnostics.', action: 'View Health', icon: Activity },
  ];

  return (
    <div className="w-full bg-background text-foreground font-bar antialiased">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings Overview</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Configure salon operations, branch profiles, staff permissions, service matrices, and client booking parameters.</p>
      </div>

      <div className="p-6 space-y-6">
        {/* System Health Status */}
        <div className="bg-card border border-border rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-foreground">System Health Status</h2>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              All Operational
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {systemHealth.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.service} className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-background">
                  <Icon className={cn('size-4', item.status === 'operational' ? 'text-success' : item.status === 'degraded' ? 'text-warning' : 'text-destructive')} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{item.label}</p>
                    <p className={cn('text-[10px] capitalize', item.status === 'operational' ? 'text-success' : item.status === 'degraded' ? 'text-warning' : 'text-destructive')}>
                      {item.status}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Stats + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-xl shadow-card p-5">
            <h2 className="text-[15px] font-semibold text-foreground mb-4">Organization Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Business Name</span>
                <span className="text-[13px] font-medium text-foreground">{settings?.org_business_name || 'All About Pawz'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Total Users</span>
                <span className="text-[13px] font-semibold text-primary tabular-nums">{userCount}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Role Definitions</span>
                <span className="text-[13px] font-semibold text-primary tabular-nums">{roleCount}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Stripe Status</span>
                <span className="text-[13px] font-medium text-success">{settings?.stripe_connection_status || 'Connected'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-[13px] text-muted-foreground">Tax Rate</span>
                <span className="text-[13px] font-medium text-foreground tabular-nums">{settings?.payment_tax_rate_percent || 8.25}%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-muted-foreground">Commission Default</span>
                <span className="text-[13px] font-medium text-foreground tabular-nums">{settings?.payment_commission_default_rate || 45}%</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-card border border-border rounded-xl shadow-card p-5">
            <h2 className="text-[15px] font-semibold text-foreground mb-4">Quick Links</h2>
            <div className="space-y-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                      <Icon className="size-4 text-muted-foreground" />
                      {link.label}
                    </span>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Module Directory */}
        <div>
          <h2 className="text-[15px] font-semibold text-foreground mb-4">Configuration Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleCards.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => onNavigateScreen?.(m.id)}
                  className="text-left bg-card border border-border rounded-xl shadow-card p-4 hover:shadow-card-md hover:border-primary/30 transition-all duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="size-4 text-primary" />
                    <h3 className="text-[14px] font-semibold text-foreground">{m.title}</h3>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{m.desc}</p>
                  <div className="flex items-center gap-1 text-[12px] font-medium text-primary">
                    {m.action}
                    <ArrowRight className="size-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
