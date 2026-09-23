'use client';

import React from 'react';
import Link from 'next/link';
import { LeashedLogo } from './LeashedLogo';
import { Instagram, Youtube, Linkedin } from 'lucide-react';
import { ROUTE_MAP } from './Navbar';

export function Footer() {
  // Navigation links matching project
  const links = [
    'Courses',
    'Classroom',
  ];

  return (
    <footer className="w-full bg-[#121814] text-white border-t border-[#1d2720] py-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-8 border-b border-[#1f2c23]">
          {/* Logo & Brand */}
          <div className="shrink-0">
            <Link href="/" className="focus:outline-none rounded-lg">
              <LeashedLogo variant="light" size="md" />
            </Link>
          </div>

          {/* Nav Links strictly from tree */}
          <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
            {links.map((link) => {
              const href = ROUTE_MAP[link] || '/';
              return (
                <Link
                  key={link}
                  href={href}
                  className="text-xs sm:text-[0.82rem] text-[#adbdb3] hover:text-white transition-colors duration-150"
                >
                  {link}
                </Link>
              );
            })}
            <Link
              href="/learn/enroll"
              className="text-xs sm:text-[0.82rem] text-[#d9b589] hover:text-[#ebd5b9] transition-colors duration-150 font-semibold"
            >
              Get Started / Enroll
            </Link>
          </nav>

          {/* Social Icons */}
          <div className="flex items-center gap-4 text-[#cbd5cf]">
            <a
              href="#instagram"
              aria-label="Instagram"
              className="p-1.5 hover:text-white transition-colors hover:scale-110 duration-150"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="#youtube"
              aria-label="YouTube"
              className="p-1.5 hover:text-white transition-colors hover:scale-110 duration-150"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a
              href="#x"
              aria-label="X (Twitter)"
              className="p-1.5 hover:text-white transition-colors hover:scale-110 duration-150"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="#linkedin"
              aria-label="LinkedIn"
              className="p-1.5 hover:text-white transition-colors hover:scale-110 duration-150"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#76867d] gap-2">
          <p>Professional Pet Care Education &amp; Career Development Programs</p>
          <p>&copy; 2025 Leashed. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
