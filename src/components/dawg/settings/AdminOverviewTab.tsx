'use client';

import React from 'react';
import { 
  Building2, 
  Users, 
  Calendar, 
  Tag, 
  CreditCard, 
  Globe, 
  UserCheck, 
  MessageSquare, 
  Package, 
  BarChart3, 
  Sliders, 
  Sparkles, 
  Link as LinkIcon, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Store
} from 'lucide-react';
import { DawgNavSection } from '@/lib/dawg-types';

interface AdminOverviewTabProps {
  onSelectTab: (tabId: string) => void;
  onNavigateSection?: (section: DawgNavSection) => void;
  onOpenQuickAction?: (action: 'appointment' | 'customer' | 'pet' | 'payment' | 'invoice') => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  onSelectTab,
  onNavigateSection,
  onOpenQuickAction,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Top Section: Business Overview Card & System Status Card */}
      <section aria-label="Business Overview and System Status" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Business Overview Card */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Business Overview</h3>
              <button
                onClick={() => onSelectTab('organization')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Edit Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Storefront / Location Thumbnail */}
              <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden shrink-0 border border-slate-100 relative bg-slate-100">
                <img
                  alt="Storefront - All About the Dawg"
                  className="w-full h-full object-cover object-center"
                  src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=400&q=80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-slate-900/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
                  Main Salon
                </span>
              </div>

              {/* Business Details & Contact */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900">All About the Dawg</h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Luxury pet grooming with love and care.</p>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>(214) 555-0198</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>info@allaboutthedawg.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>1234 Maple Drive, Frisco, TX 75034</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      className="text-indigo-600 hover:underline font-medium"
                      href="https://www.allaboutthedawg.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      www.allaboutthedawg.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
            <div>
              <span className="text-[11px] font-medium text-slate-500">Today&apos;s Appointments</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">12</p>
              <button
                onClick={() => onNavigateSection && onNavigateSection('appointments')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-1 cursor-pointer"
              >
                <span>View Calendar</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500">Today&apos;s Revenue</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">$2,450.00</p>
              <button
                onClick={() => onNavigateSection && onNavigateSection('reports')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-1 cursor-pointer"
              >
                <span>View Reports</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500">New Customers (30d)</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">24</p>
              <button
                onClick={() => onNavigateSection && onNavigateSection('customers')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-1 cursor-pointer"
              >
                <span>View Customers</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500">Outstanding Balance</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">$1,245.50</p>
              <button
                onClick={() => onNavigateSection && onNavigateSection('invoices')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-1 cursor-pointer"
              >
                <span>View Invoices</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Status Card */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">System Status</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Operational
              </span>
            </div>

            <div className="space-y-3">
              {/* Status Item: Website */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>Website</span>
                </div>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Live
                </span>
              </div>
              {/* Status Item: Customer Portal */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span>Customer Portal</span>
                </div>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Enabled
                </span>
              </div>
              {/* Status Item: Stripe */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>Stripe</span>
                </div>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Connected
                </span>
              </div>
              {/* Status Item: Email Service */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email Service</span>
                </div>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Connected
                </span>
              </div>
              {/* Status Item: SMS Service */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>SMS Service</span>
                </div>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Connected
                </span>
              </div>
              {/* Status Item: Backups */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <Sliders className="w-4 h-4 text-slate-400" />
                  <span>Backups</span>
                </div>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Up to date
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('system')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>View System Health</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Management Modules Grid (10 Cards) */}
      <section aria-label="Management Modules" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Module 1: Organization */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Organization</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Manage business profile, locations, hours, holidays, and brand settings.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('organization')}>Business Profile</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('organization')}>Locations</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('organization')}>Brand &amp; Identity</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('organization')}>Opening Hours</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('organization')}>Holiday Hours</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('organization')}>Social Links</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('organization')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Organization</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 2: Users & Access (Consolidates Admin User Settings) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Users &amp; Access</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Manage staff, roles, permissions, and customer portal access.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('users')}>Admin Users</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('users')}>Staff Members</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('users')}>Roles &amp; Permissions</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('users')}>Customer Portal Users</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('users')}>Invitations</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('users')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Users</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 3: Booking & Operations */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Booking &amp; Operations</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Configure booking rules, deposits, cancellations, and availability.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('booking')}>Booking Settings</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('booking')}>Deposits</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('booking')}>Cancellation Rules</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('booking')}>No-Show Rules</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('booking')}>Availability Rules</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('booking')}>Waitlist</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('booking')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Booking</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 4: Services & Pricing */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Tag className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Services &amp; Pricing</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Manage services, packages, add-ons, pricing rules, and promotions.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('services')}>Services</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('services')}>Packages</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('services')}>Add-ons</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('services')}>Pricing Rules</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('services')}>Discounts &amp; Promotions</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('services')}>Gift Cards / Credits</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('services')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Services</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 5: Payments */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Payments</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Configure payments, Stripe, invoices, taxes, and financial settings.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('payments')}>Stripe Settings</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('payments')}>Payment Methods</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('payments')}>Invoices</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('payments')}>Deposits</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('payments')}>Refunds</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('payments')}>Taxes &amp; Receipts</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('payments')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Payments</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 6: Website */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Website</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Manage website content, pages, media, banners, and navigation.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('website')}>Pages</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('website')}>Page Builder</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('website')}>Navigation</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('website')}>Global Content Blocks</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('website')}>Promotional Banners</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('website')}>Hero Images &amp; SEO</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('website')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Website</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 7: Customer Portal */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Customer Portal</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Configure customer portal features and user experience.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('portal')}>Portal Settings</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('portal')}>Registration &amp; Login</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('portal')}>Appointments</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('portal')}>Payments &amp; Invoices</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('portal')}>Documents</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('portal')}>Notifications</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('portal')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Portal</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 8: Communications */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Communications</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Manage email, SMS, templates, automations, and campaigns.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('communications')}>Email Settings</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('communications')}>SMS Settings</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('communications')}>Templates</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('communications')}>Automations</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('communications')}>Promotional Messages</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('communications')}>Notification Rules</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('communications')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Communications</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 9: Inventory */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Inventory</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Manage products, categories, inventory, and vendors.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('inventory')}>Products</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('inventory')}>Categories</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('inventory')}>Stock Management</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('inventory')}>Vendors</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('inventory')}>Inventory Rules</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('inventory')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage Inventory</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Module 10: Reports */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all group">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Reports</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              View and export business reports and analytics.
            </p>
            <ul className="mt-4 space-y-1 text-xs text-slate-600 list-disc list-inside marker:text-slate-400">
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('reports')}>Sales &amp; Revenue</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('reports')}>Customers</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('reports')}>Appointments</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('reports')}>Services</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('reports')}>Products</li>
              <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('reports')}>Financial Reports</li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('reports')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>View Reports</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Bottom Row: System, What's New, Quick Links */}
      <section aria-label="System Settings, What is New and Quick Links" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* System Box */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
              <Sliders className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">System</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              System preferences, integrations, audit logs, and data management.
            </p>
            <div className="grid grid-cols-2 gap-x-2 mt-4 text-xs text-slate-600">
              <ul className="space-y-1 list-disc list-inside marker:text-slate-400">
                <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('system')}>System Preferences</li>
                <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('system')}>Integrations</li>
                <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('system')}>Audit Log</li>
              </ul>
              <ul className="space-y-1 list-disc list-inside marker:text-slate-400">
                <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('system')}>API / Webhooks</li>
                <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('system')}>Import / Export</li>
                <li className="cursor-pointer hover:text-indigo-600" onClick={() => onSelectTab('system')}>Data Management</li>
              </ul>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('system')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>Manage System</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* What's New Box */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">What&apos;s New</h4>
            </div>
            <div className="space-y-3.5 mt-4">
              {/* Update Item 1 */}
              <div>
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">Promotional Banner Scheduling</h5>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    New
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Schedule banners to show on specific dates</p>
              </div>
              {/* Update Item 2 */}
              <div>
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">Customer Portal Redesign</h5>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    New
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Improved mobile experience and new features</p>
              </div>
              {/* Update Item 3 */}
              <div>
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">Automated Review Requests</h5>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    New
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Automatically request reviews after appointments</p>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('website')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>View Release Notes</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Quick Links Box */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LinkIcon className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Quick Links</h4>
            </div>
            <ul className="space-y-2.5 mt-4 text-xs font-medium text-indigo-600">
              <li>
                <button
                  onClick={() => onSelectTab('website')}
                  className="w-full flex items-center justify-between hover:underline group text-left cursor-pointer"
                >
                  <span>View Public Website</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('portal')}
                  className="w-full flex items-center justify-between hover:underline group text-left cursor-pointer"
                >
                  <span>Customer Portal Login</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('payments')}
                  className="w-full flex items-center justify-between hover:underline group text-left cursor-pointer"
                >
                  <span>Stripe Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('system')}
                  className="w-full flex items-center justify-between hover:underline group text-left cursor-pointer"
                >
                  <span>Help Center</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('system')}
                  className="w-full flex items-center justify-between hover:underline group text-left cursor-pointer"
                >
                  <span>Video Tutorials</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              </li>
            </ul>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('system')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              <span>View All Resources</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
