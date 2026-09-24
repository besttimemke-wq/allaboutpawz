'use client';

import React, { useState } from 'react';
import { tokens } from '@/lib/tokens';
import { X, Copy, Check, Palette, Type, Layers, Box } from 'lucide-react';
import { Button } from './Button';

interface TokenInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TokenInspectorModal({ isOpen, onClose }: TokenInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'components' | 'layout'>('colors');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#fdfbf7] rounded-2xl overflow-hidden shadow-2xl border border-[#dfd8c8] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#131b15] text-white px-6 py-5 flex items-center justify-between border-b border-[#243429]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#d9b589] text-[#131b15] flex items-center justify-center font-extrabold text-sm">
              L
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">LEASHED Global Design Tokens &amp; Styling System</h3>
              <p className="text-xs text-[#cbd5ce]">Standardized theme primitives, scales, and component specs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a5b6ab] hover:text-white rounded-md"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[#f2ece2] border-b border-[#ded6c5] overflow-x-auto">
          {[
            { id: 'colors', label: 'Color Palette', icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'typography', label: 'Typography Scales', icon: <Type className="w-3.5 h-3.5" /> },
            { id: 'components', label: 'Components', icon: <Box className="w-3.5 h-3.5" /> },
            { id: 'layout', label: 'Radii & Spacing', icon: <Layers className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1a2920] text-white shadow-xs'
                  : 'bg-white/60 text-[#4c5c52] hover:bg-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#637369] mb-3">
                  Core Brand Colors
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Dark Charcoal', hex: tokens.colors.brand.dark, desc: 'Headers, Nav, Footers' },
                    { name: 'Deep Forest', hex: tokens.colors.brand.forest, desc: 'Feature bar & accents' },
                    { name: 'Warm Sand (Primary)', hex: tokens.colors.brand.sand, desc: 'Primary CTAs & highlights' },
                    { name: 'Parchment Cream', hex: tokens.colors.brand.cream, desc: 'Main page canvas' },
                    { name: 'Sand Light', hex: tokens.colors.brand.sandLight, desc: 'Light accent pills' },
                    { name: 'Cream Alt', hex: tokens.colors.brand.creamAlt, desc: 'Advantage card background' },
                    { name: 'Accent Gold', hex: tokens.colors.text.accentGold, desc: 'Script calligraphy text' },
                    { name: 'Dark Border', hex: tokens.colors.border.dark, desc: 'Subtle separators' },
                  ].map((color) => (
                    <div
                      key={color.hex + color.name}
                      onClick={() => copyToClipboard(color.hex, color.name)}
                      className="group p-3 rounded-xl bg-white border border-[#e4dfd4] shadow-2xs hover:shadow-md transition-all cursor-pointer"
                    >
                      <div
                        className="w-full h-12 rounded-lg mb-2.5 border border-black/10 flex items-center justify-end p-1.5"
                        style={{ backgroundColor: color.hex }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded p-1">
                          {copiedKey === color.name ? (
                            <Check className="w-3 h-3 text-green-300" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#141b16] truncate">{color.name}</span>
                      </div>
                      <code className="text-[11px] text-[#718077] font-mono block mt-0.5">{color.hex}</code>
                      <span className="text-[10px] text-[#93a298] block mt-1 line-clamp-1">{color.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#637369] mb-3">
                  Text &amp; Neutral Tokens
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#141b16] text-white">
                    <span className="text-[10px] text-[#97a89e] uppercase block font-semibold">Inverse Heading</span>
                    <span className="text-sm font-bold text-white">White #ffffff</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#141b16] text-white">
                    <span className="text-[10px] text-[#97a89e] uppercase block font-semibold">Inverse Body</span>
                    <span className="text-sm text-[#ccd8d0]">Muted Sage #ccd8d0</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-[#ded9cb]">
                    <span className="text-[10px] text-[#718077] uppercase block font-semibold">Primary Heading</span>
                    <span className="text-sm font-bold text-[#161c18]">Dark #161c18</span>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-[#ded9cb]">
                    <span className="text-[10px] text-[#718077] uppercase block font-semibold">Secondary Body</span>
                    <span className="text-sm text-[#49574f]">Forest Slate #49574f</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typography Tab */}
          {activeTab === 'typography' && (
            <div className="space-y-6">
              <div className="p-4 bg-white rounded-xl border border-[#ded9cb] space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#718077] tracking-wider block">
                    Display Serif — Playfair Display / Editorial Serif
                  </span>
                  <p className="font-serif text-3xl sm:text-4xl text-[#141b16] font-bold mt-1">
                    Real Skills. Meaningful Careers.
                  </p>
                </div>

                <div className="border-t border-[#f0ecdf] pt-3">
                  <span className="text-[10px] uppercase font-bold text-[#718077] tracking-wider block">
                    Eyebrow / Tracked Uppercase — Plus Jakarta Sans
                  </span>
                  <p className="font-sans text-xs font-extrabold uppercase tracking-[0.2em] text-[#55665c] mt-1">
                    PROFESSIONAL PET CARE EDUCATION &bull; OUR PROGRAMS
                  </p>
                </div>

                <div className="border-t border-[#f0ecdf] pt-3">
                  <span className="text-[10px] uppercase font-bold text-[#718077] tracking-wider block">
                    Script / Calligraphic Accent — Caveat / Hand Lettering
                  </span>
                  <p className="font-script text-2xl sm:text-3xl text-[#b58b54] mt-1">
                    Better Care. Stronger Skills. Brighter Futures.
                  </p>
                </div>

                <div className="border-t border-[#f0ecdf] pt-3">
                  <span className="text-[10px] uppercase font-bold text-[#718077] tracking-wider block">
                    Body Copy — Plus Jakarta Sans (Line Height 1.6)
                  </span>
                  <p className="text-sm text-[#49574f] leading-relaxed max-w-2xl mt-1">
                    LEASHED provides industry-leading education and training for those who want to turn their love for animals into a professional career. Practical skills, professional credentials, and lifetime guidance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#637369] mb-3">
                  Button Primitives
                </h4>
                <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-[#ded9cb]">
                  <Button variant="primary-sand" withArrow>
                    Explore Our Programs
                  </Button>
                  <Button variant="secondary-dark" withArrow>
                    Explore All Programs
                  </Button>
                  <Button variant="outline-dark" withArrow>
                    Read More Success Stories
                  </Button>
                  <Button variant="ghost-link" withArrow>
                    View All Programs
                  </Button>
                  <Button variant="circle-action" />
                </div>
              </div>

              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#637369] mb-3">
                  Card &amp; Badge Layout
                </h4>
                <div className="p-4 bg-white rounded-xl border border-[#ded9cb] flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white shadow-md border border-[#eeebe3] flex items-center justify-center text-[#1a2920]">
                    <span className="text-xs font-bold">&#9986;</span>
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-[#141b16]">Card Icon Badge</p>
                    <p className="text-[#718077]">White elevation badge overlapping card media</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#ded9cb]">
                  <span className="text-[10px] uppercase font-bold text-[#718077] block">Card Radius</span>
                  <span className="text-lg font-bold text-[#141b16]">12px / 16px</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#ded9cb]">
                  <span className="text-[10px] uppercase font-bold text-[#718077] block">Pill Buttons</span>
                  <span className="text-lg font-bold text-[#141b16]">9999px (Full)</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#ded9cb]">
                  <span className="text-[10px] uppercase font-bold text-[#718077] block">Max Container</span>
                  <span className="text-lg font-bold text-[#141b16]">1440px</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#ded9cb]">
                  <span className="text-[10px] uppercase font-bold text-[#718077] block">Elevation</span>
                  <span className="text-lg font-bold text-[#141b16]">Soft Ambient</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f2ece2] border-t border-[#ded6c5] flex justify-end">
          <Button variant="secondary-dark" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
